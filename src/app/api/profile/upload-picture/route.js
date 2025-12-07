import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';

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

    // Upload to Cloudinary using FormData (native approach)
    try {
      const buffer = await file.arrayBuffer();
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', new Blob([buffer], { type: file.type }), file.name);
      cloudinaryFormData.append('upload_preset', 'career_hub_unsigned'); // Use unsigned upload
      cloudinaryFormData.append('folder', 'career-hub/profile-pictures');
      cloudinaryFormData.append('public_id', `profile-${user._id.toString()}`);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
      
      console.log('Uploading to Cloudinary:', {
        url: uploadUrl,
        preset: 'career_hub_unsigned',
        fileSize: file.size,
        fileType: file.type
      });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData
      });

      const responseText = await response.text();
      console.log('Cloudinary response status:', response.status);
      
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
        throw new Error('Invalid JSON response from Cloudinary');
      }

      if (!uploadResult.secure_url) {
        console.error('No secure_url in Cloudinary response:', uploadResult);
        throw new Error('Cloudinary did not return a secure URL');
      }

      const fileUrl = uploadResult.secure_url;
      console.log('Upload successful:', fileUrl);

      // Update profile with new picture URL
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
