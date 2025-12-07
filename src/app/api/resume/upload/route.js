import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import jwt from 'jsonwebtoken';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

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

    const fileBuffer = await file.arrayBuffer();
    console.log('File buffer size:', fileBuffer.length);
    
    // Placeholder text indicating PDF was uploaded
    let parsedText = `PDF Resume uploaded successfully. Please use the Resume Analyzer to paste your resume content for analysis, or manually enter your information in your profile.`;

    // Upload PDF to Cloudinary with fallback
    let uploadResult;
    let uploadError;

    // Method 1: Try unsigned upload first
    try {
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', new Blob([fileBuffer], { type: file.type }), file.name);
      cloudinaryFormData.append('upload_preset', 'career_hub_unsigned');
      cloudinaryFormData.append('folder', 'career-hub/resumes');
      cloudinaryFormData.append('public_id', `resume-${userData.id}-${Date.now()}`);
      cloudinaryFormData.append('resource_type', 'raw');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
      
      console.log('Attempting unsigned resume upload...');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData
      });

      const responseText = await response.text();
      
      if (response.ok) {
        uploadResult = JSON.parse(responseText);
        console.log('✓ Unsigned resume upload successful');
      } else {
        uploadError = `Unsigned upload failed: ${response.status}`;
        console.log(uploadError, responseText.substring(0, 200));
      }
    } catch (err) {
      uploadError = err.message;
      console.log('Unsigned upload error, will try signed:', uploadError);
    }

    // Method 2: Fallback to signed upload if unsigned fails
    if (!uploadResult) {
      if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return NextResponse.json({ 
          message: 'Cloudinary not properly configured',
          debug: 'Missing API credentials for signed upload'
        }, { status: 500 });
      }

      try {
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', new Blob([fileBuffer], { type: file.type }), file.name);
        cloudinaryFormData.append('folder', 'career-hub/resumes');
        cloudinaryFormData.append('public_id', `resume-${userData.id}-${Date.now()}`);
        cloudinaryFormData.append('resource_type', 'raw');
        cloudinaryFormData.append('api_key', CLOUDINARY_API_KEY);
        
        // Add timestamp for signed upload
        const timestamp = Math.floor(Date.now() / 1000);
        cloudinaryFormData.append('timestamp', timestamp.toString());
        
        // Create signature - correct format
        const crypto = require('crypto');
        const signatureString = `folder=career-hub/resumes&public_id=resume-${userData.id}-${Date.now()}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
        cloudinaryFormData.append('signature', signature);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
        
        console.log('Attempting signed resume upload...');

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: cloudinaryFormData
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('Signed upload failed:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText.substring(0, 500)
          });
          throw new Error(`Signed upload failed: ${response.status} ${response.statusText}`);
        }

        uploadResult = JSON.parse(responseText);
        console.log('✓ Signed resume upload successful');
      } catch (err) {
        console.error('Signed upload error:', err);
        return NextResponse.json({ 
          message: 'Failed to upload resume to Cloudinary',
          error: err.message
        }, { status: 500 });
      }
    }

    if (!uploadResult || !uploadResult.secure_url) {
      console.error('Invalid upload result:', uploadResult);
      return NextResponse.json({ 
        message: 'Cloudinary did not return a valid URL',
        error: 'Missing secure_url in response'
      }, { status: 500 });
    }

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