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
      console.log('Profile or resumePDF not found:', { 
        profileExists: !!profile, 
        resumePDFUrl: profile?.resumePDF 
      });
      return NextResponse.json({ message: 'No resume found' }, { status: 404 });
    }

    console.log('Resume PDF URL from profile:', profile.resumePDF);
    console.log('URL format check:', {
      includesCloudinary: profile.resumePDF.includes('cloudinary.com'),
      includesRawUpload: profile.resumePDF.includes('/raw/upload/'),
      url: profile.resumePDF
    });

    // For Cloudinary raw resources, ensure proper download parameters
    let downloadUrl = profile.resumePDF;
    
    // If it's a Cloudinary URL, add attachment flag to force download
    if (downloadUrl.includes('cloudinary.com')) {
      // For raw resources, add fl_attachment parameter
      if (downloadUrl.includes('/raw/upload/')) {
        downloadUrl = downloadUrl.includes('?') 
          ? downloadUrl + '&fl_attachment' 
          : downloadUrl + '?fl_attachment';
      } else if (downloadUrl.includes('/upload/')) {
        downloadUrl = downloadUrl.includes('?') 
          ? downloadUrl + '&fl_attachment' 
          : downloadUrl + '?fl_attachment';
      }
    }

    console.log('Download URL with parameters:', downloadUrl);

    // Return the Cloudinary URL with download parameters
    return NextResponse.json({
      success: true,
      pdfUrl: downloadUrl,
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
