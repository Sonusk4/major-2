import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Mentorship from '@/models/Mentorship';
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

export async function POST(request) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { mentorUserId, message } = body || {};
    if (!mentorUserId) return NextResponse.json({ message: 'mentorUserId is required' }, { status: 400 });
    if (String(mentorUserId) === String(authUser.id)) return NextResponse.json({ message: 'Cannot request yourself' }, { status: 400 });

    // Ensure mentee has a profile with state set (same rule as matching)
    const menteeProfile = await Profile.findOne({ user: authUser.id }).select('state');
    if (!menteeProfile || !(menteeProfile.state)) {
      return NextResponse.json({ message: 'Please set your state in profile before requesting a mentor.' }, { status: 400 });
    }

    // Validate mentor exists and is willing to mentor and same state
    const mentorProfile = await Profile.findOne({ user: mentorUserId }).select('state willingToMentor totalExperienceYears');
    const mentorUser = await User.findById(mentorUserId).select('_id');
    if (!mentorUser || !mentorProfile) return NextResponse.json({ message: 'Selected mentor not found.' }, { status: 404 });
    if (!mentorProfile.willingToMentor || (mentorProfile.totalExperienceYears || 0) < 1) {
      return NextResponse.json({ message: 'This user is not available as a mentor.' }, { status: 400 });
    }
    if (String(mentorProfile.state || '') !== String(menteeProfile.state || '')) {
      return NextResponse.json({ message: 'Mentor must be in the same state.' }, { status: 400 });
    }

    // Prevent duplicate active requests
    const existing = await Mentorship.findOne({ mentee: authUser.id, mentor: mentorUserId, status: { $in: ['pending', 'accepted'] } });
    if (existing) return NextResponse.json({ message: 'Request already exists or has been accepted.' }, { status: 200 });

    const created = await Mentorship.create({ mentee: authUser.id, mentor: mentorUserId, message: message || '' });
    return NextResponse.json({ message: 'Mentorship request sent.', mentorship: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


