import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Mentorship from '@/models/Mentorship';
import Message from '@/models/Message';
import jwt from 'jsonwebtoken';
import { publish } from '../bus';

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
    const { mentorshipId } = await params;
    if (!mentorshipId) return NextResponse.json({ message: 'mentorshipId is required' }, { status: 400 });

    const mentorship = await Mentorship.findById(mentorshipId).lean();
    if (!mentorship) return NextResponse.json({ message: 'Mentorship not found' }, { status: 404 });
    if (mentorship.status !== 'accepted') return NextResponse.json({ message: 'Mentorship not accepted' }, { status: 403 });
    if (!canAccess(authUser.id, mentorship)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    // Get all messages
    const messages = await Message.find({ mentorship: mentorshipId }).sort({ createdAt: 1 }).lean();
    
    // Mark messages from other user as seen
    const otherUserId = String(mentorship.mentor) === String(authUser.id) ? mentorship.mentee : mentorship.mentor;
    const unseenMessages = await Message.find({ 
      mentorship: mentorshipId, 
      sender: otherUserId, 
      seen: false 
    }).select('_id');
    
    if (unseenMessages.length > 0) {
      const unseenIds = unseenMessages.map(m => String(m._id));
      await Message.updateMany(
        { mentorship: mentorshipId, sender: otherUserId, seen: false },
        { seen: true, seenAt: new Date() }
      );
      // Publish message:seen event for real-time update
      publish(mentorshipId, {
        type: 'message:seen',
        item: {
          ids: unseenIds,
          seenAt: new Date()
        }
      });
    }
    
    // Get unread count for current user
    const unreadCount = await Message.countDocuments({ 
      mentorship: mentorshipId, 
      sender: otherUserId, 
      seen: false 
    });

    return NextResponse.json({ messages, unreadCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { mentorshipId } = await params;
    const body = await request.json();
    const { text } = body || {};
    if (!mentorshipId || !text) return NextResponse.json({ message: 'mentorshipId and text are required' }, { status: 400 });

    const mentorship = await Mentorship.findById(mentorshipId);
    if (!mentorship) return NextResponse.json({ message: 'Mentorship not found' }, { status: 404 });
    if (mentorship.status !== 'accepted') return NextResponse.json({ message: 'Mentorship not accepted' }, { status: 403 });
    if (!canAccess(authUser.id, mentorship)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const msg = await Message.create({ mentorship: mentorshipId, sender: authUser.id, text: String(text).slice(0, 5000), seen: false });
    
    // Publish message with all fields including seen status
    publish(mentorshipId, { 
      type: 'message', 
      item: { 
        _id: String(msg._id), 
        text: msg.text, 
        createdAt: msg.createdAt, 
        sender: String(msg.sender),
        seen: msg.seen
      } 
    });
    
    return NextResponse.json({ message: 'Sent', item: msg }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


