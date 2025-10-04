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

function canAccess(userId, mentorship) {
  if (!mentorship) return false;
  return String(mentorship.mentor) === String(userId) || String(mentorship.mentee) === String(userId);
}

export async function GET(request, { params }) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });
    const mentorship = await Mentorship.findById(id).lean();
    if (!mentorship) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!canAccess(authUser.id, mentorship)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({
      mentorship: {
        id: String(mentorship._id),
        mentor: String(mentorship.mentor),
        mentee: String(mentorship.mentee),
        status: mentorship.status,
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


