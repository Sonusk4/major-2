import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Mentorship from '@/models/Mentorship';
import { subscribe } from '../../bus';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

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
  const encoder = new TextEncoder();
  try {
    // Allow token via query string for EventSource
    const { searchParams } = new URL(request.url);
    const tokenFromQS = searchParams.get('token');
    let authUser = null;
    if (tokenFromQS) {
      try { authUser = jwt.verify(tokenFromQS, process.env.JWT_SECRET); } catch (_) { authUser = null; }
    }
    if (!authUser) authUser = getDataFromToken(request);
    if (!authUser) return new NextResponse('Unauthorized', { status: 401 });
    const { mentorshipId } = await params;
    const mentorship = await Mentorship.findById(mentorshipId).lean();
    if (!mentorship || mentorship.status !== 'accepted' || !canAccess(authUser.id, mentorship)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const stream = new ReadableStream({
      start(controller) {
        const send = (payload) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        const unsubscribe = subscribe(mentorshipId, send);
        // send a ping
        send({ type: 'ready' });
        controller._cleanup = unsubscribe;
      },
      cancel() {
        if (this._cleanup) this._cleanup();
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new NextResponse('Server error', { status: 500 });
  }
}


