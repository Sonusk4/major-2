import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
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
    // Verify JWT token
    const userData = getDataFromToken(request);
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get user's profile with resume file ID
    const profile = await Profile.findOne({ user: userData.id });

    if (!profile || !profile.resumePDF) {
      return NextResponse.json(
        { message: 'No resume found. Please upload a resume first.' },
        { status: 404 }
      );
    }

    const fileId = profile.resumePDF;
    const fileName = profile.resumeFileName || 'resume.pdf';
    
    console.log(`[MongoDB Download] Fetching PDF for user ${userData.id}`);
    console.log(`[MongoDB Download] File ID: ${fileId}`);

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
        console.log(`[MongoDB Download] File downloaded successfully (${chunks.length} chunks)`);
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

    console.log(`[MongoDB Download] Total size: ${pdfBuffer.length} bytes`);

    // Return PDF as blob with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[MongoDB Download] Error:', error);

    if (error.message?.includes('jwt')) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to download resume. Please try again.' },
      { status: 500 }
    );

  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
