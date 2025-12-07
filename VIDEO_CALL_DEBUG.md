# Video Call Receiver Issue - Debugging Checklist

## Problem
Receiver doesn't see IncomingCallModal when caller initiates a call. Caller sees "ringing" but receiver sees nothing.

## Root Cause Analysis

The issue is likely one of these:
1. **Socket.io connection not authenticated on receiver's side**
2. **Socket.io listeners not attached before signal arrives**
3. **Signal not being broadcast to receiver's room**
4. **React state not updating properly**

## Step-by-Step Debugging

### Step 1: Verify Socket.io Connection (Receiver Side)
Open browser console on receiver's tab and run:
```javascript
// Check if socket exists
console.log('Socket ref:', window.__socketRef);

// Or check Socket.io manager
console.log(document.querySelector('[data-socket-connected]'));
```

**Expected logs in console:**
- `Initializing Socket.io with userId: [id] mentorshipId: [id]`
- `Socket connected, authenticating...`
- `Setting up Socket.io listeners for call:signal`

**If not showing, Socket.io isn't initialized**

### Step 2: Verify Server Receives Authentication (Server Console)
When receiver loads chat page, server should log:
```
User [userId] authenticated for mentorship [mentorshipId]
Socket [socket-id] joined room mentorship:[mentorshipId]
```

**If not showing, receiver's Socket.io connection didn't authenticate**

### Step 3: Verify Signal Broadcast (Server Console)
When caller clicks "📞 Video Call", server should log:
```
Peer signal generated, emitting to [otherUserId]
call:signal emitted
Received call:signal from [sender-socket-id] to [receiver-userId] in mentorship [mentorshipId]
Emitted call:signal to mentorship:[mentorshipId] room
```

**If "Received call:signal" not showing, signal didn't reach server**

### Step 4: Verify Signal Received (Receiver Console)
Receiver should see:
```
Received call:signal from [sender-socket-id]
Showing incoming call modal
```

**If not showing, listener not attached properly**

### Step 5: Verify State Update
Receiver should see IncomingCallModal appear with ringing sound

**If not showing after Step 4 logs, React state update issue**

## Quick Fixes to Try

### Fix 1: Force Page Refresh
Refresh the receiver's page and have caller try again. Sometimes Socket.io doesn't connect on first load.

### Fix 2: Check Browser Console for Errors
Look for:
- CORS errors
- Socket.io connection errors
- `io is not defined` errors
- Network tab shows failed WebSocket/polling

### Fix 3: Check currentUserId is Set
Receiver must be logged in. Verify in console:
```javascript
// Check if currentUserId state is set
// Look for "Initializing Socket.io with userId:" log
```

### Fix 4: Verify Mentorship Room
Both users must join same room. Check server logs:
```
Socket [id1] joined room mentorship:[mentorshipId]
Socket [id2] joined room mentorship:[mentorshipId]
```

## Network Debugging

### Using Browser DevTools

**Network Tab:**
- Look for `/socket.io/?...` requests
- Should see WebSocket connection
- Or HTTP polling if WebSocket fails

**Console Tab:**
- Filter by "socket" keyword
- Should see Socket.io logs
- Look for connection/authentication events

### Testing Socket.io Connection

In browser console on receiver's tab:
```javascript
// Check if socket connected
console.log('Socket ID:', socketRef?.current?.id);
console.log('Socket connected:', socketRef?.current?.connected);

// Manually trigger listener (for testing only)
socketRef?.current?.emit('test', { message: 'test' });
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Socket not initializing | currentUserId/mentorshipId not loaded | Wait for auth/mentorship data to load |
| Socket initializes but no auth | Connection race condition | Ensure emit happens after 'connect' event |
| Auth event sent but no room join | Server not handling auth | Check server logs for "authenticated for mentorship" |
| Signal received but modal not showing | State not updating | Check React DevTools for state changes |
| Modal shows but no ringing | Audio API error | Check browser permissions & console errors |

## Server Debugging Commands

```bash
# Watch server logs in real-time
npm run dev

# You should see:
# Socket connected: [id]
# User [userId] authenticated for mentorship [mentorshipId]
# Socket [id] joined room mentorship:[mentorshipId]
# Received call:signal from [id] to [userId]
# Emitted call:signal to mentorship:[mentorshipId] room
```

## Key Files to Check

1. **Chat Page**: `src/app/chat/[mentorshipId]/page.js`
   - Socket.io initialization
   - currentUserId extraction from JWT
   - Listener setup
   - IncomingCallModal rendering

2. **VideoCallModal**: `src/components/VideoCallModal.jsx`
   - Signal emission when peer signals
   - Socket prop handling

3. **IncomingCallModal**: `src/components/IncomingCallModal.jsx`
   - Modal rendering
   - Ringing sound

4. **Socket Server**: `src/lib/socket.js`
   - Auth handler
   - Room joining
   - Signal broadcasting

## Test Case

1. **User A** (mentor): Open chat with User B
2. **User B** (mentee): Open chat with User A (same mentorshipId)
3. **Verify both are connected**: Check server console for both auth events
4. **User A clicks "📞 Video Call"**
   - Check User A console: "Peer signal generated"
   - Check Server console: "Received call:signal"
5. **Check User B**:
   - Should see IncomingCallModal
   - Should hear ringing sound
   - Console should show: "Received call:signal from [id]"

If User B doesn't see modal, go through debugging steps above to identify which step fails.
