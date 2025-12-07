# Video Call Feature - Testing Guide

## How to Test Video Calling

### Prerequisites
- Two browser windows/tabs (or two devices)
- Both logged in as different users (mentor and mentee)
- Established mentorship connection

### Testing Steps

1. **Open Chat with Mentorship Partner**
   - User A: Go to chat page with User B
   - User B: Go to chat page with User A (same mentorshipId)

2. **Message Functionality** (Verify this works first)
   - Type a message in one window
   - Verify message appears in both windows instantly via EventSource

3. **Start Video Call (User A)**
   - User A clicks "📞 Video Call" button
   - VideoCallModal appears for User A
   - Check browser console for: "Peer signal generated, emitting to [userId]"

4. **Receive Call (User B)**
   - IncomingCallModal should appear with ringing sound
   - Check browser console for: "Received call:signal from [socketId]"
   - If not appearing, check:
     - Both Socket.io connections authenticated (auth event sent)
     - Both in same `mentorship:${mentorshipId}` room
     - Socket.io server logs show `Socket connected` messages

5. **Accept Call (User B)**
   - Click "✓ Accept" button
   - VideoCallModal opens for User B
   - Browser may ask for camera/microphone permissions
   - Grant permissions

6. **Video Connection**
   - Both users should see their own video in the modal
   - After WebRTC handshake, remote video should appear
   - If connection fails:
     - Check STUN servers are accessible (google STUN servers)
     - Check browser console for WebRTC errors
     - Verify simple-peer is installed (`npm list simple-peer`)

7. **Features to Test**
   - **Toggle Audio**: Click microphone icon
   - **Toggle Video**: Click camera icon  
   - **Screen Share**: Click screen share icon (browser will ask for screen selection)
   - **End Call**: Close the modal or click close button

### Debugging

**If receiver doesn't see incoming call:**
1. Check browser console in receiver's window:
   - Look for "Received call:signal from" message
   - If not there, Socket.io listener not working

2. Check Socket.io connection:
   - Verify Socket.io server running (should see "Socket.io initialized" in server console)
   - Both users should see "Socket connected: [id]" in server logs

3. Check mentorship room:
   - Both users should join room `mentorship:${mentorshipId}`
   - Server should log this

**If video doesn't connect after accepting:**
1. Check browser console for WebRTC errors
2. Verify STUN servers:
   ```javascript
   // Test in browser console
   fetch('http://stun.l.google.com:19302')
   ```

3. Check if SimplePeer is receiving remote stream:
   - Console should show "Peer signal generated" multiple times
   - After connection, "Stream established" or similar

**Server Debugging:**
```bash
# Watch server logs
npm run dev  # outputs Socket.io connection logs
```

## Architecture

- **Frontend**: React components (VideoCallModal, IncomingCallModal)
- **WebRTC**: SimplePeer library (wrapper around native WebRTC)
- **Signaling**: Socket.io (real-time signal exchange for SDP offers/answers)
- **Video/Audio**: getUserMedia API
- **Screen Sharing**: getDisplayMedia API

## Key Files
- `src/components/VideoCallModal.jsx` - Main video call component
- `src/components/IncomingCallModal.jsx` - Incoming call notification
- `src/app/chat/[mentorshipId]/page.js` - Chat with video integration
- `src/lib/socket.js` - Socket.io server setup
- `server.js` - Custom Node.js server with Socket.io
