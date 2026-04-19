const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/watchyyy')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Store active rooms in memory for quick access
const activeRooms = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', async ({ username, videoUrl }, callback) => {
    try {
      const roomId = uuidv4().slice(0, 8); // Short room ID
      
      const room = new Room({
        roomId,
        videoUrl: videoUrl || '',
        participants: [{
          socketId: socket.id,
          username
        }]
      });
      
      await room.save();
      
      socket.join(roomId);
      activeRooms.set(roomId, room);
      
      console.log(`Room created: ${roomId} by ${username}`);
      callback({ success: true, roomId, room });
    } catch (error) {
      console.error('Error creating room:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Join an existing room
  socket.on('join-room', async ({ roomId, username }, callback) => {
    try {
      let room = await Room.findOne({ roomId });
      
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      // Check if user already in room (reconnect scenario)
      const existingParticipant = room.participants.find(p => p.socketId === socket.id);
      if (!existingParticipant) {
        room.participants.push({
          socketId: socket.id,
          username
        });
        await room.save();
      }

      socket.join(roomId);
      activeRooms.set(roomId, room);

      // Notify other participants
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
        participants: room.participants
      });

      console.log(`${username} joined room: ${roomId}`);
      callback({ success: true, room });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Update video URL
  socket.on('update-video', async ({ roomId, videoUrl }) => {
    try {
      const room = await Room.findOneAndUpdate(
        { roomId },
        { videoUrl, 'videoState.isPlaying': false, 'videoState.currentTime': 0 },
        { new: true }
      );
      
      if (room) {
        io.to(roomId).emit('video-updated', { videoUrl });
      }
    } catch (error) {
      console.error('Error updating video:', error);
    }
  });

  // Video state change (play/pause/seek)
  socket.on('video-state-change', async ({ roomId, state }) => {
    try {
      const { isPlaying, currentTime } = state;
      
      await Room.findOneAndUpdate(
        { roomId },
        { 
          'videoState.isPlaying': isPlaying,
          'videoState.currentTime': currentTime,
          'videoState.lastUpdated': Date.now()
        }
      );

      // Broadcast to all other clients in the room
      socket.to(roomId).emit('video-state-sync', {
        isPlaying,
        currentTime,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error syncing video state:', error);
    }
  });

  // Chat message
  socket.on('chat-message', ({ roomId, message, username }) => {
    const chatData = {
      id: uuidv4(),
      message,
      username,
      timestamp: Date.now()
    };
    
    // Broadcast to all clients in the room including sender
    io.to(roomId).emit('chat-message', chatData);
  });

  // WebRTC Signaling - Offer
  socket.on('webrtc-offer', ({ roomId, targetId, offer }) => {
    socket.to(targetId).emit('webrtc-offer', {
      senderId: socket.id,
      offer
    });
  });

  // WebRTC Signaling - Answer
  socket.on('webrtc-answer', ({ roomId, targetId, answer }) => {
    socket.to(targetId).emit('webrtc-answer', {
      senderId: socket.id,
      answer
    });
  });

  // WebRTC Signaling - ICE Candidate
  socket.on('webrtc-ice-candidate', ({ roomId, targetId, candidate }) => {
    socket.to(targetId).emit('webrtc-ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  // Request to join video call (notify others)
  socket.on('join-video-call', ({ roomId }) => {
    socket.to(roomId).emit('user-joined-video', {
      socketId: socket.id
    });
  });

  // Leave video call
  socket.on('leave-video-call', ({ roomId }) => {
    socket.to(roomId).emit('user-left-video', {
      socketId: socket.id
    });
  });

  // Get room participants
  socket.on('get-participants', async ({ roomId }, callback) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        callback({ success: true, participants: room.participants });
      } else {
        callback({ success: false, error: 'Room not found' });
      }
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    try {
      // Find and update all rooms where this user was a participant
      const rooms = await Room.find({ 'participants.socketId': socket.id });
      
      for (const room of rooms) {
        room.participants = room.participants.filter(p => p.socketId !== socket.id);
        await room.save();
        
        // Notify remaining participants
        socket.to(room.roomId).emit('user-left', {
          socketId: socket.id,
          participants: room.participants
        });

        // Clean up empty rooms
        if (room.participants.length === 0) {
          await Room.deleteOne({ roomId: room.roomId });
          activeRooms.delete(room.roomId);
          console.log(`Room ${room.roomId} deleted (empty)`);
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// API Routes
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (room) {
      res.json({ success: true, room });
    } else {
      res.status(404).json({ success: false, error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
