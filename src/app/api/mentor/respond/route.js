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
    const { mentorshipId, action } = body || {};
    if (!mentorshipId || !action) return NextResponse.json({ message: 'mentorshipId and action are required' }, { status: 400 });

    const mentorship = await Mentorship.findById(mentorshipId);
    if (!mentorship) return NextResponse.json({ message: 'Mentorship not found' }, { status: 404 });
    if (String(mentorship.mentor) !== String(authUser.id)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (mentorship.status !== 'pending') return NextResponse.json({ message: 'Request is not pending' }, { status: 400 });

    if (action === 'accept') {
      mentorship.status = 'accepted';
      mentorship.respondedAt = new Date();
    } else if (action === 'decline') {
      mentorship.status = 'declined';
      mentorship.respondedAt = new Date();
    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    await mentorship.save();
    return NextResponse.json({ message: `Request ${mentorship.status}.`, mentorship }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


