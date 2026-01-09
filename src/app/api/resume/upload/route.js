import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import jwt from 'jsonwebtoken';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();

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
    console.log('File buffer size:', fileBuffer.byteLength);
    
    // Store placeholder text - we won't parse PDF
    // Users will upload in profile, and use Resume Analyzer to paste or auto-populate
    let parsedText = `Resume PDF uploaded successfully on ${new Date().toLocaleDateString()}. Please go to Resume Analyzer to analyze your resume.`;
    
    try {
      // Attempt to parse PDF to extract text
      const pdfParse = (await import('pdf-parse')).default;
      const bufferInstance = Buffer.from(fileBuffer);
      
      if (bufferInstance && bufferInstance.length > 0) {
        const pdfData = await pdfParse(bufferInstance);
        if (pdfData.text && pdfData.text.trim().length > 50) {
          parsedText = pdfData.text;
          console.log('✓ PDF parsed successfully, text length:', parsedText.length);
        }
      }
    } catch (parseError) {
      console.error('PDF parsing skipped (non-critical):', parseError.message);
      // Continue with simple message if parsing fails
    }

    // Upload PDF to Cloudinary using UNSIGNED upload (public, no auth needed)
    let uploadResult;
    let publicId;

    const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUDINARY_UPLOAD_PRESET) {
      return NextResponse.json({ 
        message: 'Cloudinary upload preset not configured',
        debug: 'Missing CLOUDINARY_UPLOAD_PRESET'
      }, { status: 500 });
    }

    try {
      publicId = `resume-${userData.id}-${Date.now()}`;
      
      // Create form data for UNSIGNED upload (uses preset, no signature needed)
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: file.type }), file.name);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'resumes');
      formData.append('public_id', publicId);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
      
      console.log('Uploading resume to Cloudinary (UNSIGNED)...');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('Cloudinary upload failed:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 500)
        });
        return NextResponse.json({ 
          message: 'Failed to upload resume to Cloudinary',
          error: responseText.substring(0, 200)
        }, { status: 500 });
      }

      uploadResult = JSON.parse(responseText);
      console.log('✓ Resume uploaded successfully to Cloudinary (UNSIGNED)');
    } catch (err) {
      console.error('Resume upload error:', err);
      return NextResponse.json({ 
        message: 'Failed to upload resume',
        error: err.message
      }, { status: 500 });
    }

    if (!uploadResult || !uploadResult.secure_url) {
      console.error('Invalid upload result:', uploadResult);
      return NextResponse.json({ 
        message: 'Cloudinary did not return a valid URL',
        error: 'Missing secure_url in response'
      }, { status: 500 });
    }

    let pdfUrl = uploadResult.secure_url;
    
    // For unsigned uploads, Cloudinary might return URLs that need .pdf extension
    if (!pdfUrl.endsWith('.pdf')) {
      pdfUrl = pdfUrl + '.pdf';
    }

    console.log('Final PDF URL:', pdfUrl);

    console.log('Before saving to profile:');
    console.log('  uploadResult.public_id:', uploadResult.public_id);
    console.log('  pdfUrl:', pdfUrl);

    // Use the auto-generated public_id from Cloudinary response
    const cloudinaryPublicId = uploadResult.public_id || publicId;

    // Always save the profile, even if parsing failed
    const updatedProfile = await Profile.findOneAndUpdate(
      { user: userData.id },
      { 
        parsedResumeText: parsedText,
        resumePDF: pdfUrl,
        resumePublicId: cloudinaryPublicId,
        headline: "Software Developer",
        bio: "Resume uploaded"
      },
      { upsert: true, new: true }
    );

    console.log('✓ Resume saved to profile');
    console.log('Updated profile resumePublicId:', updatedProfile?.resumePublicId);
    console.log('Resume URL:', pdfUrl);

    return NextResponse.json({ message: "Resume uploaded successfully", fileUrl: pdfUrl }, { status: 200 });
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}