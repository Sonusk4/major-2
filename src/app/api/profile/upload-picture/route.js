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

    // Try unsigned upload first, fallback to signed if it fails
    let uploadResult;
    let uploadError;

    // Method 1: Try unsigned upload (requires preset to exist)
    if (true) {
      try {
        const buffer = await file.arrayBuffer();
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', new Blob([buffer], { type: file.type }), file.name);
        cloudinaryFormData.append('upload_preset', 'career_hub_unsigned');
        cloudinaryFormData.append('folder', 'career-hub/profile-pictures');
        cloudinaryFormData.append('public_id', `profile-${user._id.toString()}`);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        
        console.log('Attempting unsigned upload...');

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: cloudinaryFormData
        });

        const responseText = await response.text();
        
        if (response.ok) {
          uploadResult = JSON.parse(responseText);
          console.log('✓ Unsigned upload successful');
        } else {
          // Log but don't throw - will try signed upload
          uploadError = `Unsigned upload failed: ${response.status}`;
          console.log(uploadError, responseText.substring(0, 200));
        }
      } catch (err) {
        uploadError = err.message;
        console.log('Unsigned upload error, will try signed:', uploadError);
      }
    }

    // Method 2: Fallback to signed upload if unsigned fails
    if (!uploadResult) {
      if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return NextResponse.json({ 
          message: 'Cloudinary not properly configured',
          debug: 'Missing API credentials for signed upload'
        }, { status: 500 });
      }

      try {
        const buffer = await file.arrayBuffer();
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', new Blob([buffer], { type: file.type }), file.name);
        cloudinaryFormData.append('folder', 'career-hub/profile-pictures');
        cloudinaryFormData.append('public_id', `profile-${user._id.toString()}`);
        cloudinaryFormData.append('api_key', CLOUDINARY_API_KEY);
        
        // Add timestamp for signed upload
        const timestamp = Math.floor(Date.now() / 1000);
        cloudinaryFormData.append('timestamp', timestamp.toString());
        
        // Create signature - correct format
        const crypto = require('crypto');
        // Format: folder=career-hub/profile-pictures&public_id=profile-xxx&timestamp=1234567890{api_secret}
        const signatureString = `folder=career-hub/profile-pictures&public_id=profile-${user._id.toString()}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
        cloudinaryFormData.append('signature', signature);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        
        console.log('Attempting signed upload with signature...');

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: cloudinaryFormData
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('Signed upload failed:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText.substring(0, 500)
          });
          throw new Error(`Signed upload failed: ${response.status} ${response.statusText}`);
        }

        uploadResult = JSON.parse(responseText);
        console.log('✓ Signed upload successful');
      } catch (err) {
        console.error('Signed upload error:', err);
        return NextResponse.json({ 
          message: 'Failed to upload image to Cloudinary',
          error: err.message
        }, { status: 500 });
      }
    }

    if (!uploadResult || !uploadResult.secure_url) {
      console.error('Invalid upload result:', uploadResult);
      return NextResponse.json({ 
        message: 'Cloudinary did not return a valid URL',
        error: 'Missing secure_url in response'
      }, { status: 500 });
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

  } catch (error) {
    console.error('Profile picture upload error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
