import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import jwt from 'jsonwebtoken';

const getDataFromToken = (request) => {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] || '';
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export async function GET(request) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure a profile exists; create a minimal default if missing
    const profile = await Profile.findOneAndUpdate(
      { user: userData.id },
      {
        $setOnInsert: {
          user: userData.id,
          fullName: userData.name || '',
          headline: 'Software Developer',
          bio: '',
          skills: []
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ profile }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await request.json();
    
    // Ensure skills is properly formatted as an array
    if (reqBody.skills) {
      if (Array.isArray(reqBody.skills)) {
        reqBody.skills = reqBody.skills.filter(skill => skill && skill.trim());
      } else if (typeof reqBody.skills === 'string') {
        reqBody.skills = reqBody.skills.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        reqBody.skills = [];
      }
    } else {
      reqBody.skills = [];
    }

    console.log('Received profile update for user:', userData.id);
    console.log('Request body:', reqBody);
    console.log('Skills to save:', reqBody.skills);

    const profile = await Profile.findOneAndUpdate(
      { user: userData.id },
      { ...reqBody, user: userData.id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log('Profile after update:', {
      id: profile._id,
      user: profile.user,
      skills: profile.skills,
      headline: profile.headline
    });

    return NextResponse.json({ message: "Profile updated successfully", profile }, { status: 200 });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}