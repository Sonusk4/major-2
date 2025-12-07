import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { userId, roomId } = await req.json();

    if (!userId || !roomId) {
      return Response.json({ error: 'Missing userId or roomId' }, { status: 400 });
    }

    // Get environment variables
    const appIDStr = process.env.NEXT_PUBLIC_ZEGO_APP_ID;
    const secret = process.env.ZEGO_SERVER_SECRET;

    console.log('Token generation - AppID env:', appIDStr ? 'set' : 'NOT SET');
    console.log('Token generation - Secret env:', secret ? 'set' : 'NOT SET');

    if (!appIDStr || !secret) {
      console.error('Missing env vars - AppID:', appIDStr, 'Secret:', secret);
      return Response.json({ 
        error: 'Missing ZEGOCLOUD configuration',
        debug: { appIDSet: !!appIDStr, secretSet: !!secret }
      }, { status: 500 });
    }

    const appID = parseInt(appIDStr);

    if (isNaN(appID)) {
      return Response.json({ error: 'Invalid ZEGO_APP_ID format' }, { status: 500 });
    }

    // Token expiry: 1 hour from now
    const expiryTime = Math.floor(Date.now() / 1000) + 3600;

    // Create the payload for the token
    const payload = {
      app_id: appID,
      user_id: userId.toString(),
      nonce: Math.random().toString(36).substring(2, 15),
      ctime: Math.floor(Date.now() / 1000),
      expire: expiryTime,
      type: 0, // 0 for basic user
      room_id: roomId,
    };

    console.log('Generating token with payload:', { app_id: payload.app_id, user_id: payload.user_id, room_id: payload.room_id });

    // Generate the token using HS256
    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

    console.log('Token generated successfully');

    return Response.json({ token, expireTime: expiryTime }, { status: 200 });
  } catch (error) {
    console.error('Token generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
