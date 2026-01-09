import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';

export async function GET(request) {
  try {
    await dbConnect();

    // Get token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get profile with resume PDF URL
    const profile = await Profile.findOne({ user: decoded.id });
    if (!profile || !profile.resumePDF) {
      console.log('Profile or resumePDF not found');
      return NextResponse.json({ message: 'No resume found. Please upload a resume first.' }, { status: 404 });
    }

    const pdfUrl = profile.resumePDF;
    console.log('Fetching PDF from Cloudinary:', pdfUrl);

    // Fetch the PDF from Cloudinary (backend to backend - no auth needed for unsigned uploads)
    const pdfResponse = await fetch(pdfUrl);
    
    console.log('Cloudinary response status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF from Cloudinary:', pdfResponse.status);
      return NextResponse.json(
        { message: `Failed to fetch PDF: ${pdfResponse.status}` }, 
        { status: pdfResponse.status }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      console.error('PDF buffer is empty');
      return NextResponse.json(
        { message: 'PDF file is empty or corrupted' }, 
        { status: 400 }
      );
    }

    console.log('✓ PDF fetched successfully, size:', pdfBuffer.byteLength);

    // Return the PDF file directly
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength,
        'Content-Disposition': `attachment; filename="resume-${Date.now()}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Resume download error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
