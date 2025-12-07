import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// This helper function correctly extracts the token from the 'Authorization' header
const getDataFromToken = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export async function POST(request) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData || userData.role !== 'developer') {
      return NextResponse.json({ message: "Unauthorized: Invalid or missing token" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    // Validate file is a PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ message: "Only PDF files are allowed" }, { status: 400 });
    }

    // Validate file size (max 10MB for PDFs)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "File size must be less than 10MB" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log('File buffer size:', fileBuffer.length);
    
    // Placeholder text indicating PDF was uploaded
    let parsedText = `PDF Resume uploaded successfully. Please use the Resume Analyzer to paste your resume content for analysis, or manually enter your information in your profile.`;

    // Upload PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'career-hub/resumes',
          public_id: `resume-${userData.id}-${Date.now()}`,
          resource_type: 'raw',
          type: 'upload',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(fileBuffer);
    });

    const pdfUrl = uploadResult.secure_url;

    // Always save the profile, even if parsing failed
    // The user can manually edit their profile information later

    const updatedProfile = await Profile.findOneAndUpdate(
      { user: userData.id },
      { 
        $set: { 
          parsedResumeText: parsedText,
          resumePDF: pdfUrl
        },
        $setOnInsert: { 
          headline: "Software Developer",
          bio: "Resume uploaded",
          skills: [],
          experience: [],
          education: []
        }
      },
      { upsert: true, new: true }
    );

    console.log('Resume upload - User ID:', userData.id);
    console.log('Resume upload - Profile updated:', !!updatedProfile);
    console.log('Resume upload - PDF URL:', pdfUrl);

    return NextResponse.json({ message: "Resume uploaded successfully to cloud", fileUrl: pdfUrl }, { status: 200 });
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}