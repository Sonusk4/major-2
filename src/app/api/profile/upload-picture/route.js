import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
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

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Upload to Cloudinary
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Verify Cloudinary is configured
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ 
        message: 'Cloudinary not properly configured',
        debug: {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY ? 'present' : 'missing',
          apiSecret: process.env.CLOUDINARY_API_SECRET ? 'present' : 'missing'
        }
      }, { status: 500 });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'career-hub/profile-pictures',
          public_id: `profile-${user._id}-${Date.now()}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload stream error:', {
              message: error.message,
              http_code: error.http_code,
              status: error.status
            });
            reject(error);
          } else resolve(result);
        }
      );

      uploadStream.on('error', (error) => {
        console.error('Cloudinary stream error event:', error);
        reject(error);
      });

      uploadStream.end(fileBuffer);
    });

    const fileUrl = uploadResult.secure_url;

    // Update profile with new picture URL from Cloudinary
    const updatedProfile = await Profile.findOneAndUpdate(
      { user: user._id },
      { profilePicture: fileUrl },
      { upsert: true, new: true }
    );

    return NextResponse.json({ 
      message: 'Profile picture uploaded successfully',
      fileUrl: fileUrl
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
