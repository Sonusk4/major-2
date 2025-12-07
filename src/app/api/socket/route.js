// Socket.io signaling documentation
// This API handles WebRTC signaling for video calls
// The Socket.io server is configured on the client side (socket.io-client)
// and connects to the origin server which should have Socket.io running

// For local development: Socket.io needs to be configured in next.config.mjs or via a custom server
// For Render/production: Configure Socket.io with custom Node.js server or use Heroku's Socket.io integration

import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({
    status: 'Socket.io signaling endpoint',
    message: 'Clients connect via Socket.io for WebRTC signaling',
    events: {
      'call:signal': 'SDP offers/answers for peer connection',
      'call:end': 'Terminate video call',
      'call:reject': 'Reject incoming video call'
    }
  }, { status: 200 });
}

export async function POST(request) {
  // This would handle fallback HTTP polling for signaling if Socket.io WebSocket fails
  try {
    const body = await request.json();
    // Socket.io client will handle reconnection and fallback to HTTP polling
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
