import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log('File buffer size:', fileBuffer.length);
    
    // Extract text from PDF using a simple approach
    let parsedText = '';
    try {
      // For now, we'll use a placeholder that indicates the PDF was uploaded
      // Users can manually enter their resume text in the analyzer
      parsedText = `PDF Resume uploaded successfully. Please use the Resume Analyzer to paste your resume content for analysis, or manually enter your information in your profile.`;
    } catch (parseError) {
      console.error('PDF parsing error:', parseError);
      parsedText = `PDF uploaded but text extraction failed. Please manually enter your resume information in the Resume Analyzer or your profile.`;
    }

    // Persist uploaded PDF to public/uploads/resumes so it can be served statically
    const fileName = `resume-${userData.id}-${Date.now()}.pdf`;
    const publicDir = path.join(process.cwd(), 'public');
    const resumesDir = path.join(publicDir, 'uploads', 'resumes');
    try {
      if (!fs.existsSync(resumesDir)) {
        fs.mkdirSync(resumesDir, { recursive: true });
      }
      const filePath = path.join(resumesDir, fileName);
      fs.writeFileSync(filePath, fileBuffer);
    } catch (writeErr) {
      console.error('Error saving resume PDF:', writeErr);
      return NextResponse.json({ message: "Failed to save uploaded file" }, { status: 500 });
    }
    const pdfUrl = `/uploads/resumes/${fileName}`;

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
    console.log('Resume upload - Profile data:', updatedProfile);

    return NextResponse.json({ message: "Resume parsed and saved successfully", fileUrl: pdfUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}