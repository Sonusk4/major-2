import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';

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

export async function GET(request) {
  let mongoClient;

  try {
    // Verify JWT token and check if requester is cofounder
    const userData = getDataFromToken(request);
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if requester is cofounder
    if (userData.role !== 'cofounder') {
      return NextResponse.json(
        { message: 'Only cofounders can view developer resumes' },
        { status: 403 }
      );
    }

    // Get developerId from query params
    const { searchParams } = new URL(request.url);
    const developerId = searchParams.get('developerId');

    if (!developerId) {
      return NextResponse.json(
        { message: 'Developer ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Verify developer exists
    const developer = await User.findById(developerId);
    if (!developer || developer.role !== 'developer') {
      return NextResponse.json(
        { message: 'Developer not found' },
        { status: 404 }
      );
    }

    // Get developer's profile with resume file ID
    const profile = await Profile.findOne({ user: developerId });

    if (!profile || !profile.resumePDF) {
      return NextResponse.json(
        { message: 'This developer has not uploaded a resume yet.' },
        { status: 404 }
      );
    }

    const fileId = profile.resumePDF;
    const fileName = profile.resumeFileName || `${developer.name}-resume.pdf`;
    
    console.log(`[View Developer Resume] Cofounder ${userData.id} viewing resume of developer ${developerId}`);
    console.log(`[View Developer Resume] File ID: ${fileId}`);

    // Connect to MongoDB and download from GridFS
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();

    const database = mongoClient.db('Cluster1');
    const bucket = new GridFSBucket(database);

    // Download file from GridFS
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    // Collect chunks into buffer
    const chunks = [];
    
    await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        console.log(`[View Developer Resume] File downloaded successfully (${chunks.length} chunks)`);
        resolve();
      });

      downloadStream.on('error', reject);
    });

    const pdfBuffer = Buffer.concat(chunks);

    if (pdfBuffer.length === 0) {
      return NextResponse.json(
        { message: 'Downloaded file is empty' },
        { status: 400 }
      );
    }

    console.log(`[View Developer Resume] Total size: ${pdfBuffer.length} bytes`);

    // Return PDF as blob with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[View Developer Resume] Error:', error);

    if (error.message?.includes('jwt')) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to view resume. Please try again.' },
      { status: 500 }
    );

  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
