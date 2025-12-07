// src/app/api/calls/initiate/route.js
import { ObjectId } from 'mongodb';
import { pusherServer } from '../../../../lib/pusher';
import connectMongoDB from '../../../../lib/mongodb';

export async function POST(request) {
  try {
    const { mentorshipId, roomId, type, callerId } = await request.json();
    
    // Input validation
    if (!mentorshipId || !roomId || !type || !callerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Connect to the database
      const client = await connectMongoDB();
      const db = client.db();
      
      // Get the mentorship details
      const mentorship = await db.collection('mentorships').findOne({
        _id: new ObjectId(mentorshipId)
      });

      if (!mentorship) {
        return new Response(
          JSON.stringify({ error: 'Mentorship not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Determine who is the other user (the one being called)
      const calleeId = String(mentorship.mentorId) === callerId 
        ? mentorship.menteeId 
        : mentorship.mentorId;

      // Trigger Pusher event to notify the callee
      try {
        const channel = `user-${calleeId}`;
        const payload = {
          mentorshipId,
          roomId,
          type,
          callerId,
          timestamp: Date.now()
        };

        await pusherServer.trigger(channel, 'incoming-call', payload);
      } catch (pusherError) {
        console.error('Pusher error:', pusherError);
        // Continue even if Pusher fails
      }

      // Return success response with room details
      return new Response(
        JSON.stringify({ 
          success: true,
          roomId,
          calleeId
        }), 
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Database operation failed');
    }

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}