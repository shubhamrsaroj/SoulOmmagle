import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './db/init.js';
import dotenv from 'dotenv';
import { findBestMatch, saveInterests, updateUserOnlineStatus } from './services/interestMatching.js';
import interestsRouter from './routes/interests.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Add security headers middleware
app.use((req, res, next) => {
  // Allow cross-origin isolation
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Maps to track users and matches
const activeUsers = new Map();
const activeRooms = new Map();
const userSocketMap = new Map();

// Routes
app.use('/api/interests', interestsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoom = null;

  socket.on('register-user', ({ userId, interests }) => {
    console.log('User registered:', userId, 'with interests:', interests);
    userSocketMap.set(socket.id, userId);
    
    // Store user info
    activeUsers.set(userId, {
      socketId: socket.id,
      interests: interests.map(i => i.toLowerCase()).sort()
    });

    // Find match
    for (const [otherUserId, otherUser] of activeUsers.entries()) {
      if (otherUserId !== userId) {
        const commonInterests = interests
          .map(i => i.toLowerCase())
          .filter(interest => otherUser.interests.includes(interest));

        if (commonInterests.length > 0) {
          const roomId = `room_${Date.now()}`;
          
          // Store room info
          activeRooms.set(roomId, {
            users: [userId, otherUserId],
            commonInterests,
            initiator: userId // Track who initiated the room
          });

          console.log('Match found:', {
            roomId,
            users: [userId, otherUserId],
            commonInterests
          });

          // Remove users from active pool
          activeUsers.delete(userId);
          activeUsers.delete(otherUserId);

          // Notify both users
          io.to(otherUser.socketId).emit('match-found', {
            matchedUserId: userId,
            commonInterests,
            roomId
          });
          
          socket.emit('match-found', {
            matchedUserId: otherUserId,
            commonInterests,
            roomId
          });
          
          return;
        }
      }
    }
    console.log('No match found for user:', userId);
  });

  socket.on('join-room', async ({ roomId }) => {
    console.log(`Socket ${socket.id} joining room ${roomId}`);
    
    // Leave previous room if any
    if (currentRoom) {
      console.log(`Leaving previous room: ${currentRoom}`);
      socket.leave(currentRoom);
    }
    
    currentRoom = roomId;
    await socket.join(roomId);
    
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;
    const roomInfo = activeRooms.get(roomId);
    
    console.log(`Room ${roomId} has ${numClients} clients`);

    if (numClients === 1) {
      // First peer joins
      socket.emit('ready-to-connect', { 
        isInitiator: roomInfo && roomInfo.initiator === userSocketMap.get(socket.id),
        roomId
      });
    } else if (numClients === 2) {
      // Second peer joins - start signaling
      const roomMembers = Array.from(room);
      
      // Notify both peers to start connection
      io.in(roomId).emit('start-signaling', {
        roomId,
        peers: roomMembers
      });

      // Tell peers their roles
      roomMembers.forEach(peerId => {
        io.to(peerId).emit('ready-to-connect', {
          isInitiator: roomInfo && roomInfo.initiator === userSocketMap.get(peerId),
          roomId
        });
      });
    }
  });

  // WebRTC Signaling
  socket.on('offer', ({ offer, roomId }) => {
    console.log(`Socket ${socket.id} sending offer in room ${roomId}`);
    socket.to(roomId).emit('offer', {
      offer,
      from: socket.id
    });
  });

  socket.on('answer', ({ answer, roomId }) => {
    console.log(`Socket ${socket.id} sending answer in room ${roomId}`);
    socket.to(roomId).emit('answer', {
      answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    console.log(`Socket ${socket.id} sending ICE candidate in room ${roomId}`);
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  socket.on('leave-room', ({ roomId }) => {
    console.log(`Socket ${socket.id} leaving room ${roomId}`);
    if (currentRoom === roomId) {
      socket.leave(roomId);
      currentRoom = null;
      
      // Notify others in the room
      socket.to(roomId).emit('peer-left', {
        peerId: socket.id
      });
      
      const room = io.sockets.adapter.rooms.get(roomId);
      if (!room || room.size === 0) {
        activeRooms.delete(roomId);
        console.log(`Room ${roomId} deleted - no more participants`);
      }
    }
  });

  socket.on('chat-message', ({ roomId, message, sender, timestamp }) => {
    console.log(`Chat message in room ${roomId} from ${sender}: ${message}`);
    if (currentRoom === roomId) {
      // Broadcast the message to everyone in the room except the sender
      socket.to(roomId).emit('chat-message', {
        message,
        sender,
        timestamp,
        from: socket.id
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userId = userSocketMap.get(socket.id);
    
    if (userId) {
      activeUsers.delete(userId);
      userSocketMap.delete(socket.id);
      
      if (currentRoom) {
        // Notify room members
        socket.to(currentRoom).emit('peer-left', {
          peerId: socket.id
        });
        
        const room = io.sockets.adapter.rooms.get(currentRoom);
        if (!room || room.size === 0) {
          activeRooms.delete(currentRoom);
          console.log(`Room ${currentRoom} deleted after disconnect`);
        }
      }
    }
  });
});

// Error handling
io.engine.on("connection_error", (err) => {
  console.log('Connection error:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { io };