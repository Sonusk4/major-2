import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Mentorship from '@/models/Mentorship';
import Message from '@/models/Message';
import jwt from 'jsonwebtoken';
import { publish } from '../[mentorshipId]/../bus';

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

export async function PATCH(request) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { messageId, text } = await request.json();
    if (!messageId || !text) return NextResponse.json({ message: 'messageId and text are required' }, { status: 400 });
    const msg = await Message.findById(messageId);
    if (!msg) return NextResponse.json({ message: 'Message not found' }, { status: 404 });
    const mentorship = await Mentorship.findById(msg.mentorship);
    if (!mentorship || !canAccess(authUser.id, mentorship)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    // Only sender can edit
    if (String(msg.sender) !== String(authUser.id)) return NextResponse.json({ message: 'Only sender can edit' }, { status: 403 });
    msg.text = String(text).slice(0, 5000);
    msg.editedAt = new Date();
    await msg.save();
    publish(msg.mentorship, { type: 'message:update', item: { _id: String(msg._id), text: msg.text, editedAt: msg.editedAt } });
    return NextResponse.json({ message: 'Updated', item: msg }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    if (!messageId) return NextResponse.json({ message: 'messageId is required' }, { status: 400 });
    const msg = await Message.findById(messageId);
    if (!msg) return NextResponse.json({ message: 'Message not found' }, { status: 404 });
    const mentorship = await Mentorship.findById(msg.mentorship);
    if (!mentorship || !canAccess(authUser.id, mentorship)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    // Only sender can delete for everyone; adjust logic here if mentors can moderate
    if (String(msg.sender) !== String(authUser.id)) return NextResponse.json({ message: 'Only sender can delete' }, { status: 403 });
    msg.text = 'Message deleted';
    msg.deletedAt = new Date();
    await msg.save();
    publish(msg.mentorship, { type: 'message:delete', item: { _id: String(msg._id), deletedAt: msg.deletedAt } });
    return NextResponse.json({ message: 'Deleted', item: msg }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


