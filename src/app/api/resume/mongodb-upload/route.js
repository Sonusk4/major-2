import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import jwt from 'jsonwebtoken';
import { MongoClient, GridFSBucket } from 'mongodb';

const getDataFromToken = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export async function POST(request) {
  let mongoClient;
  
  try {
    const userData = getDataFromToken(request);
    if (!userData || userData.role !== 'developer') {
      return NextResponse.json({ 
        message: "Unauthorized: Invalid or missing token" 
      }, { status: 401 });
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
    console.log('✓ File received:', file.name, 'Size:', fileBuffer.byteLength);

    // Connect to MongoDB and upload to GridFS
    await dbConnect();
    
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();

    const database = mongoClient.db('Cluster1');
    const bucket = new GridFSBucket(database);

    // Create upload stream
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        userId: userData.id,
        uploadDate: new Date(),
        mimeType: file.type,
        originalName: file.name
      }
    });

    // Write file to GridFS
    const fileId = await new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        console.log('✓ File uploaded to MongoDB GridFS');
        resolve(uploadStream.id);
      });
      uploadStream.on('error', reject);
      uploadStream.write(Buffer.from(fileBuffer));
      uploadStream.end();
    });

    // Extract text from PDF (optional)
    let parsedText = `Resume PDF uploaded successfully on ${new Date().toLocaleDateString()}.`;
    
    try {
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
    }

    // Update Profile with GridFS file ID
    const updatedProfile = await Profile.findOneAndUpdate(
      { user: userData.id },
      {
        parsedResumeText: parsedText,
        resumePDF: fileId,
        resumeFileName: file.name,
        headline: "Software Developer",
        bio: "Resume uploaded"
      },
      { upsert: true, new: true }
    );

    console.log('✓ Resume metadata saved to profile');
    console.log('GridFS File ID:', fileId);

    return NextResponse.json({ 
      message: "Resume uploaded successfully to MongoDB", 
      fileId: fileId.toString(),
      fileName: file.name
    }, { status: 200 });

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ 
      message: "Server Error", 
      error: error.message 
    }, { status: 500 });
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
