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

    const requests = await Mentorship.find({ mentor: authUser.id })
      .sort({ createdAt: -1 })
      .lean();

    const menteeIds = [...new Set(requests.map(r => String(r.mentee)))];
    const mentees = await User.find({ _id: { $in: menteeIds } }).select('name email').lean();
    const menteeProfiles = await Profile.find({ user: { $in: menteeIds } }).select('headline state district college skills').lean();

    const idToUser = new Map(mentees.map(m => [String(m._id), m]));
    const idToProfile = new Map(menteeProfiles.map(p => [String(p.user), p]));

    const data = requests.map(r => {
      const u = idToUser.get(String(r.mentee));
      const p = idToProfile.get(String(r.mentee));
      return {
        id: String(r._id),
        status: r.status,
        menteeUserId: String(r.mentee),
        menteeName: u?.name || 'Mentee',
        menteeEmail: u?.email || '',
        menteeHeadline: p?.headline || '',
        menteeState: p?.state || '',
        menteeDistrict: p?.district || '',
        menteeCollege: p?.college || '',
        menteeSkills: Array.isArray(p?.skills) ? p.skills : [],
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ requests: data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


