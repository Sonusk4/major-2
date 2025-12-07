// src/app/api/calls/initiate/route.js
import { ObjectId } from 'mongodb';
import { dbConnect } from '@/lib/dbConnect';
import Mentorship from '@/models/Mentorship';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { mentorshipId, roomId, type, callerId } = await request.json();
    
    // Input validation
    if (!mentorshipId || !roomId || !type || !callerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Get the mentorship details
      const mentorship = await Mentorship.findById(mentorshipId);

      if (!mentorship) {
        return new Response(
          JSON.stringify({ error: 'Mentorship not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Determine who is the other user (the one being called)
      const calleeId = String(mentorship.mentor) === callerId 
        ? mentorship.mentee 
        : mentorship.mentor;

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