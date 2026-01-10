const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id} (${socket.user.firstName})`);

    // Join user to their own room for private messages and notifications
    socket.join(`user_${socket.user._id}`);

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.user._id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.user._id} left conversation ${conversationId}`);
    });

    // Typing indicator
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.user._id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`
      });
    });

    // Stop typing indicator
    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: socket.user._id
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit new message to conversation participants
const emitNewMessage = (conversationId, message, senderId, receiverId) => {
  if (io) {
    // Emit to conversation room
    io.to(`conversation_${conversationId}`).emit('new_message', {
      conversationId,
      message
    });

    // Also emit to receiver's personal room (for notification badge updates)
    io.to(`user_${receiverId}`).emit('message_notification', {
      conversationId,
      message
    });
  }
};

module.exports = { initSocket, getIO, emitNewMessage };
