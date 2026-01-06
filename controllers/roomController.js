const Room = require('../models/roomModel');

// Get all rooms with filters (for listing page)
exports.getAllRooms = async (req, res) => {
  try {
    const {
      city,
      area,
      roomType,
      minPrice,
      maxPrice,
      beds,
      amenities,
      status,
      sortBy,
      page = 1,
      limit = 12
    } = req.query;

    const filter = {};

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (area) {
      filter['location.area'] = { $regex: area, $options: 'i' };
    }

    if (roomType && roomType !== 'All Types') {
      filter.roomType = roomType;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (beds) {
      filter.beds = Number(beds);
    }

    // Filter by amenities (comma-separated string)
    if (amenities) {
      const amenityList = amenities.split(',');
      amenityList.forEach(amenity => {
        filter[`amenities.${amenity}`] = true;
      });
    }

    // Show all active rooms (available, rented, pending) - exclude only inactive
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['available', 'rented', 'pending'] };
    }

    // Build sort object
    let sort = { createdAt: -1 };
    if (sortBy === 'price_low') sort = { price: 1 };
    else if (sortBy === 'price_high') sort = { price: -1 };
    else if (sortBy === 'rating') sort = { 'rating.average': -1 };
    else if (sortBy === 'newest') sort = { createdAt: -1 };

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('owner', 'firstName lastName avatar')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Room.countDocuments(filter)
    ]);

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

// Get popular rooms near user (for landing page)
exports.getPopularRooms = async (req, res) => {
  try {
    const { city, limit = 6 } = req.query;

    // Show all active rooms (available, rented, pending)
    const filter = { status: { $in: ['available', 'rented', 'pending'] } };

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    // Get rooms sorted by rating and featured status
    const rooms = await Room.find(filter)
      .populate('owner', 'firstName lastName avatar')
      .sort({ isFeatured: -1, 'rating.average': -1, views: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get featured rooms (for landing page carousel)
exports.getFeaturedRooms = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const rooms = await Room.find({
      isFeatured: true,
      status: { $in: ['available', 'rented', 'pending'] }
    })
      .populate('owner', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single room by ID
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('owner', 'firstName lastName email phone avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Increment view count
    room.views += 1;
    await room.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new room (protected)
exports.createRoom = async (req, res) => {
  try {
    const roomData = {
      ...req.body,
      owner: req.user.id
    };

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update room (protected - owner only)
exports.updateRoom = async (req, res) => {
  try {
    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check ownership
    if (room.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this room'
      });
    }

    room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete room (protected - owner only)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check ownership
    if (room.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room'
      });
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get rooms by owner (protected)
exports.getMyRooms = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { owner: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Room.countDocuments(filter)
    ]);

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

// Search rooms
exports.searchRooms = async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = { $regex: q, $options: 'i' };

    const filter = {
      status: { $in: ['available', 'rented', 'pending'] },
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { 'location.city': searchRegex },
        { 'location.area': searchRegex }
      ]
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('owner', 'firstName lastName avatar')
        .sort({ 'rating.average': -1 })
        .skip(skip)
        .limit(Number(limit)),
      Room.countDocuments(filter)
    ]);

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

// Get available cities (for filters)
exports.getCities = async (req, res) => {
  try {
    const cities = await Room.distinct('location.city', { status: { $in: ['available', 'rented', 'pending'] } });

    res.status(200).json({
      success: true,
      cities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
