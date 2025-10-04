import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const getDataFromToken = (request) => {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] || '';
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    return null;
  }
};

export async function GET(request, { params }) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: 'Profile id is required' }, { status: 400 });
    }

    // Only co-founders or the owner can view another user's profile
    const requestingUser = await User.findById(authUser.id).select('role');
    const isCofounder = requestingUser?.role === 'cofounder';
    const isOwner = authUser.id === id;
    if (!isCofounder && !isOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const profile = await Profile.findOne({ user: id });
    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }

    // Return safe fields
    const safeProfile = {
      user: profile.user,
      fullName: profile.fullName,
      headline: profile.headline,
      bio: profile.bio,
      skills: profile.skills || [],
      profilePicture: profile.profilePicture || '',
      resumePDF: profile.resumePDF || '',
      parsedResumeText: profile.parsedResumeText || '',
      experience: profile.experience || [],
      education: profile.education || [],
      village: profile.village || '',
      district: profile.district || '',
      state: profile.state || profile.address?.state || '',
      college: profile.college || '',
      totalExperienceYears: profile.totalExperienceYears || 0,
      willingToMentor: !!profile.willingToMentor,
      updatedAt: profile.updatedAt,
    };

    return NextResponse.json({ profile: safeProfile }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

// Save/Update professional information
export async function PUT(request, { params }) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: 'Profile id is required' }, { status: 400 });
    }

    // Only co-founders or the owner can update the profile
    const requestingUser = await User.findById(authUser.id).select('role');
    const isCofounder = requestingUser?.role === 'cofounder';
    const isOwner = authUser.id === id;
    if (!isCofounder && !isOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist allowed fields only
    const allowed = {
      fullName: 'string',
      headline: 'string',
      bio: 'string',
      skills: 'array',
      experience: 'array',
      education: 'array',
      parsedResumeText: 'string',
      resumePDF: 'string',
      village: 'string',
      district: 'string',
      state: 'string',
      college: 'string',
      totalExperienceYears: 'number',
      willingToMentor: 'boolean',
      address: 'object' // {street, city, state, zipCode, country}
    };

    const update = {};
    for (const [key, type] of Object.entries(allowed)) {
      if (key in body && body[key] !== undefined) {
        const v = body[key];
        if (
          (type === 'string' && typeof v === 'string') ||
          (type === 'number' && typeof v === 'number') ||
          (type === 'boolean' && typeof v === 'boolean') ||
          (type === 'array' && Array.isArray(v)) ||
          (type === 'object' && v && typeof v === 'object' && !Array.isArray(v))
        ) {
          update[key] = v;
        }
      }
    }

    // Ensure arrays are arrays of objects/strings as expected
    if (Array.isArray(update.skills)) {
      update.skills = update.skills.map(s => String(s).trim()).filter(Boolean);
    }
    if (Array.isArray(update.experience)) {
      update.experience = update.experience.map(e => ({
        title: e?.title || e?.position || '',
        position: e?.position || e?.title || '',
        company: e?.company || '',
        years: e?.years || e?.duration || '',
        description: e?.description || ''
      }));
    }
    if (Array.isArray(update.education)) {
      update.education = update.education.map(ed => ({
        degree: ed?.degree || '',
        fieldOfStudy: ed?.fieldOfStudy || ed?.field || '',
        institution: ed?.institution || ed?.school || ''
      }));
    }

    const updated = await Profile.findOneAndUpdate(
      { user: id },
      { $set: update, $setOnInsert: { user: id } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ message: 'Profile updated', profile: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
    







