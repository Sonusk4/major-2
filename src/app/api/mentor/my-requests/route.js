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

export async function GET(request) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const requests = await Mentorship.find({ mentee: authUser.id })
      .sort({ createdAt: -1 })
      .lean();

    const mentorIds = [...new Set(requests.map(r => String(r.mentor)))];
    const mentors = await User.find({ _id: { $in: mentorIds } }).select('name email').lean();
    const mentorProfiles = await Profile.find({ user: { $in: mentorIds } }).select('headline state district college').lean();

    const idToUser = new Map(mentors.map(m => [String(m._id), m]));
    const idToProfile = new Map(mentorProfiles.map(p => [String(p.user), p]));

    const data = requests.map(r => {
      const u = idToUser.get(String(r.mentor));
      const p = idToProfile.get(String(r.mentor));
      return {
        id: String(r._id),
        status: r.status,
        mentorUserId: String(r.mentor),
        mentorName: u?.name || 'Mentor',
        mentorEmail: u?.email || '',
        mentorHeadline: p?.headline || '',
        mentorState: p?.state || '',
        mentorDistrict: p?.district || '',
        mentorCollege: p?.college || '',
        createdAt: r.createdAt
      };
    });

    return NextResponse.json({ requests: data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


