import { Server as SocketServer } from 'socket.io';

// This will hold the Socket.io server instance
let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function setIO(io) {
  ioInstance = io;
}

// Map to track users and their mentorship connections
const userConnections = new Map(); // userId -> { socket, mentorships: Set }

export function initializeSocket(httpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate and store user connection
    socket.on('auth', (data) => {
      const { userId, mentorshipId } = data;
      if (userId && mentorshipId) {
        console.log(`User ${userId} authenticated for mentorship ${mentorshipId}`);
        if (!userConnections.has(userId)) {
          userConnections.set(userId, { socket, mentorships: new Set() });
        }
        const userConn = userConnections.get(userId);
        userConn.mentorships.add(mentorshipId);

        // Join a room for this mentorship for easy broadcasting
        socket.join(`mentorship:${mentorshipId}`);
        console.log(`Socket ${socket.id} joined room mentorship:${mentorshipId}`);
      }
    });

    // Handle WebRTC signaling for video calls
    socket.on('call:signal', (data) => {
      const { mentorshipId, to, signal } = data;
      console.log(`Received call:signal from ${socket.id} in mentorship ${mentorshipId}, broadcasting to room`);
      
      if (mentorshipId && to) {
        // Broadcast to all users in the mentorship room with sender info
        io.to(`mentorship:${mentorshipId}`).emit('call:signal', {
          from: socket.id,
          signal,
          mentorshipId,
        });
        console.log(`Emitted call:signal to mentorship:${mentorshipId}`);
      }
    });

    // Handle call rejection
    socket.on('call:reject', (data) => {
      const { mentorshipId, to } = data;
      const targetConn = userConnections.get(to);
      if (targetConn) {
        targetConn.socket.emit('call:rejected', { mentorshipId });
      }
    });

    // Handle call end
    socket.on('call:end', (data) => {
      const { mentorshipId } = data;
      io.to(`mentorship:${mentorshipId}`).emit('call:ended');
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Clean up user connections
      for (const [userId, userConn] of userConnections.entries()) {
        if (userConn.socket.id === socket.id) {
          userConnections.delete(userId);
          break;
        }
      }
    });
  });

  setIO(io);
  return io;
}

export default ioInstance;
