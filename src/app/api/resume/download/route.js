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
      return NextResponse.json({ message: 'No resume found' }, { status: 404 });
    }

    // Return the Cloudinary URL directly without modification
    // The browser will handle the PDF display/download
    return NextResponse.json({
      success: true,
      pdfUrl: profile.resumePDF,
      message: 'Resume PDF URL retrieved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Resume download error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
