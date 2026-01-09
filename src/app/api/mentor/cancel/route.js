import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Mentorship from '@/models/Mentorship';
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
    const { mentorshipId } = body || {};
    if (!mentorshipId) return NextResponse.json({ message: 'mentorshipId is required' }, { status: 400 });

    const mentorship = await Mentorship.findById(mentorshipId);
    if (!mentorship) return NextResponse.json({ message: 'Mentorship not found' }, { status: 404 });
    
    // Check if the user is the mentee who made the request
    if (String(mentorship.mentee) !== String(authUser.id)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Only allow cancellation of pending requests
    if (mentorship.status !== 'pending') {
      return NextResponse.json({ message: 'Can only cancel pending requests' }, { status: 400 });
    }

    mentorship.status = 'cancelled';
    mentorship.respondedAt = new Date();
    await mentorship.save();

    return NextResponse.json({ message: 'Mentorship request cancelled successfully', mentorship }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
