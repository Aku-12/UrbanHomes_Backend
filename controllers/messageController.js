const { Message, Conversation } = require('../models/messageModel');
const Room = require('../models/roomModel');
const User = require('../models/userModel');
const { emitNewMessage } = require('../config/socket');
const { createNotification } = require('./notificationController');

// Get or create conversation
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { roomId } = req.params;
    const tenantId = req.user.id;

    // Get room with owner info
    const room = await Room.findById(roomId).populate('owner', 'firstName lastName email phone avatar');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const landlordId = room.owner._id;

    // Prevent landlord from messaging themselves
    if (landlordId.toString() === tenantId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot message yourself'
      });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      room: roomId,
      tenant: tenantId,
      landlord: landlordId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        room: roomId,
        tenant: tenantId,
        landlord: landlordId
      });
    }

    // Populate conversation
    conversation = await Conversation.findById(conversation._id)
      .populate('room', 'title images price location')
      .populate('tenant', 'firstName lastName email phone avatar')
      .populate('landlord', 'firstName lastName email phone avatar');

    // Get landlord stats
    const landlord = room.owner;
    const roomCount = await Room.countDocuments({ owner: landlordId });
    const oldestRoom = await Room.findOne({ owner: landlordId }).sort({ createdAt: 1 });
    const yearsHosting = oldestRoom 
      ? Math.floor((Date.now() - oldestRoom.createdAt) / (1000 * 60 * 60 * 24 * 365)) 
      : 0;

    res.status(200).json({
      success: true,
      conversation,
      landlordInfo: {
        ...landlord.toObject(),
        stats: {
          reviews: 156, // Placeholder - implement actual review count
          rating: 4.9,  // Placeholder - implement actual rating
          yearsHosting: Math.max(yearsHosting, 1)
        },
        responseTime: '1 hour'
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    console.log('getMessages - userId:', userId, 'role:', req.user.role, 'conversationId:', conversationId);

    // Verify user is part of conversation or is admin
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      console.log('Conversation not found');
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    console.log('Conversation found - tenant:', conversation.tenant.toString(), 'landlord:', conversation.landlord.toString());

    const isParticipant = conversation.tenant.toString() === userId || conversation.landlord.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    console.log('isParticipant:', isParticipant, 'isAdmin:', isAdmin);

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'firstName lastName avatar')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { 
        conversation: conversationId, 
        sender: { $ne: userId },
        isRead: false 
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id.toString();

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Verify user is part of conversation or is admin
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.tenant.toString() === senderId || conversation.landlord.toString() === senderId;
    const isAdmin = req.user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this conversation'
      });
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content.trim()
    });

    // Update conversation
    conversation.lastMessage = content.trim().substring(0, 100);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Populate sender info
    await message.populate('sender', 'firstName lastName avatar');

    // Emit socket event for real-time updates
    // If admin is sending, they're acting as the landlord, so notify the tenant
    let receiverId;
    if (isAdmin && !isParticipant) {
      // Admin sending on behalf of landlord - notify tenant
      receiverId = conversation.tenant.toString();
    } else {
      // Normal participant - notify the other party
      receiverId = conversation.tenant.toString() === senderId 
        ? conversation.landlord.toString() 
        : conversation.tenant.toString();
    }
    
    try {
      emitNewMessage(conversationId, message, senderId, receiverId);
    } catch (socketError) {
      console.log('Socket not available:', socketError.message);
    }

    // Create notification for receiver
    try {
      const senderName = `${req.user.firstName} ${req.user.lastName}`;
      await createNotification(receiverId, {
        type: 'message',
        title: `New Message from ${senderName}`,
        message: content.trim().substring(0, 100),
        icon: 'message-circle',
        relatedId: conversationId,
        relatedModel: 'Message',
        link: `/messages/${conversationId}`
      });
    } catch (notifError) {
      console.log('Notification error:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all conversations for user
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Admins can see all conversations, users only see their own
    let query;
    if (isAdmin) {
      query = {}; // All conversations
    } else {
      query = { $or: [{ tenant: userId }, { landlord: userId }] };
    }

    const conversations = await Conversation.find(query)
      .populate('room', 'title images price')
      .populate('tenant', 'firstName lastName avatar email')
      .populate('landlord', 'firstName lastName avatar')
      .sort({ lastMessageAt: -1 });

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          isRead: false
        });
        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
