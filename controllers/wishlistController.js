const Wishlist = require('../models/wishlistModel');
const Room = require('../models/roomModel');

// Add room to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      user: req.user.id,
      room: roomId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Room already in wishlist'
      });
    }

    const wishlistItem = await Wishlist.create({
      user: req.user.id,
      room: roomId
    });

    res.status(201).json({
      success: true,
      message: 'Room added to wishlist',
      wishlistItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove room from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { roomId } = req.params;

    const wishlistItem = await Wishlist.findOneAndDelete({
      user: req.user.id,
      room: roomId
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Room not found in wishlist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [wishlistItems, total] = await Promise.all([
      Wishlist.find({ user: req.user.id })
        .populate({
          path: 'room',
          populate: {
            path: 'owner',
            select: 'firstName lastName avatar'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Wishlist.countDocuments({ user: req.user.id })
    ]);

    // Extract rooms from wishlist items
    const rooms = wishlistItems
      .filter(item => item.room) // Filter out items where room was deleted
      .map(item => ({
        ...item.room.toObject(),
        addedToWishlistAt: item.createdAt
      }));

    res.status(200).json({
      success: true,
      count: rooms.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Check if room is in user's wishlist
exports.checkWishlist = async (req, res) => {
  try {
    const { roomId } = req.params;

    const wishlistItem = await Wishlist.findOne({
      user: req.user.id,
      room: roomId
    });

    res.status(200).json({
      success: true,
      isInWishlist: !!wishlistItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle wishlist (add if not exists, remove if exists)
exports.toggleWishlist = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const existing = await Wishlist.findOne({
      user: req.user.id,
      room: roomId
    });

    if (existing) {
      await existing.deleteOne();
      return res.status(200).json({
        success: true,
        message: 'Room removed from wishlist',
        isInWishlist: false
      });
    }

    await Wishlist.create({
      user: req.user.id,
      room: roomId
    });

    res.status(200).json({
      success: true,
      message: 'Room added to wishlist',
      isInWishlist: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
