import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

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

    // Verify Cloudinary is configured
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('Cloudinary configuration missing:', {
        cloudName: CLOUDINARY_CLOUD_NAME ? 'present' : 'missing',
        apiKey: CLOUDINARY_API_KEY ? 'present' : 'missing',
        apiSecret: CLOUDINARY_API_SECRET ? 'present' : 'missing'
      });
      return NextResponse.json({ 
        message: 'Cloudinary not properly configured'
      }, { status: 500 });
    }

    // Upload to Cloudinary via REST API
    try {
      const buffer = await file.arrayBuffer();
      const base64String = Buffer.from(buffer).toString('base64');
      
      // Create URL encoded form data
      const params = new URLSearchParams();
      params.append('file', `data:${file.type};base64,${base64String}`);
      params.append('folder', 'career-hub/profile-pictures');
      params.append('public_id', `profile-${user._id}-${Date.now()}`);
      params.append('api_key', CLOUDINARY_API_KEY);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      
      console.log('Uploading to Cloudinary:', {
        url: uploadUrl,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKeyLength: CLOUDINARY_API_KEY.length,
        fileSize: file.size,
        fileType: file.type
      });

      const authHeader = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: params,
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('Cloudinary upload failed:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 500)
        });
        throw new Error(`Cloudinary returned ${response.status}: ${response.statusText}`);
      }

      let uploadResult;
      try {
        uploadResult = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Cloudinary response:', responseText.substring(0, 500));
        throw new Error('Invalid response from Cloudinary');
      }

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
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return NextResponse.json({ 
        message: 'Failed to upload image to Cloudinary', 
        error: uploadError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Profile picture upload error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
