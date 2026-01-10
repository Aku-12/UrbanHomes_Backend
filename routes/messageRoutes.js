const express = require('express');
const router = express.Router();

const {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUserConversations
} = require('../controllers/messageController');

const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get all user conversations
router.get('/conversations', getUserConversations);

// Get or create conversation for a room
router.get('/room/:roomId/conversation', getOrCreateConversation);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', getMessages);

// Send message to a conversation
router.post('/conversations/:conversationId/messages', sendMessage);

module.exports = router;
