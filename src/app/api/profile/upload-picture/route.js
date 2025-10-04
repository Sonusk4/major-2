import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';
import fs from 'fs';
import path from 'path';

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

    // Save the image to public/uploads/profile-pictures so it can be served statically
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures');
    fs.mkdirSync(uploadDir, { recursive: true });

    const extensionFromName = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const safeExtension = (extensionFromName || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `profile-${user._id}-${Date.now()}.${safeExtension}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, fileBuffer);

    const fileUrl = `/uploads/profile-pictures/${fileName}`;

    // Update profile with new picture URL
    await Profile.findOneAndUpdate(
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
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
