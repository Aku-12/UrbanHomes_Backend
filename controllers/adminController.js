const User = require('../models/userModel');
const Room = require('../models/roomModel');
const Booking = require('../models/bookingsModel');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalRooms,
      totalBookings,
      activeUsers,
      blockedUsers,
      pendingBookings
    ] = await Promise.all([
      Room.countDocuments(),
      Booking.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'blocked' }),
      Booking.countDocuments({ status: 'pending' })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalRooms,
        totalBookings,
        activeUsers,
        blockedUsers,
        pendingBookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get recent bookings for dashboard
exports.getRecentBookings = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const bookings = await Booking.find()
      .populate('room', 'title location images price')
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all rooms for admin (with landlord info)
exports.getAllRoomsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.area': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('owner', 'firstName lastName email phone')
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

// Toggle room status (active/inactive)
exports.toggleRoomStatus = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Toggle between available and inactive
    room.status = room.status === 'inactive' ? 'available' : 'inactive';
    await room.save();

    res.status(200).json({
      success: true,
      message: `Room status changed to ${room.status}`,
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete room (admin)
exports.deleteRoomAdmin = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
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

// Get all users for admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, role, search } = req.query;

    const filter = { role: { $ne: 'admin' } }; // Exclude admins from list

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot block an admin user'
      });
    }

    user.status = 'blocked';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = 'active';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user details
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all bookings for admin with filters and pagination
exports.getAllBookingsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'date' } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Build sort object
    let sort = { createdAt: -1 };
    if (sortBy === 'date') sort = { createdAt: -1 };
    else if (sortBy === 'status') sort = { status: 1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('room', 'title price location images owner')
        .populate('user', 'firstName lastName email phone')
        .populate({
          path: 'room',
          populate: {
            path: 'owner',
            select: 'firstName lastName'
          }
        })
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve booking
exports.approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be approved'
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Update room status to rented
    if (booking.room) {
      booking.room.status = 'rented';
      await booking.room.save();
    }

    res.status(200).json({
      success: true,
      message: 'Booking approved successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject booking
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be rejected'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Restore room availability
    if (booking.room) {
      booking.room.status = 'available';
      await booking.room.save();
    }

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room', 'title price location images')
      .populate('user', 'firstName lastName email phone')
      .populate({
        path: 'room',
        populate: {
          path: 'owner',
          select: 'firstName lastName email phone'
        }
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search across rooms, users, bookings
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = { $regex: q, $options: 'i' };

    const [rooms, users, bookings] = await Promise.all([
      Room.find({
        $or: [
          { title: searchRegex },
          { 'location.city': searchRegex },
          { 'location.area': searchRegex }
        ]
      })
        .populate('owner', 'firstName lastName')
        .limit(5),
      User.find({
        role: { $ne: 'admin' },
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      })
        .select('firstName lastName email role status')
        .limit(5),
      Booking.find()
        .populate({
          path: 'room',
          match: { title: searchRegex }
        })
        .populate('user', 'firstName lastName')
        .limit(5)
    ]);

    // Filter out bookings where room didn't match
    const filteredBookings = bookings.filter(b => b.room !== null);

    res.status(200).json({
      success: true,
      results: {
        rooms,
        users,
        bookings: filteredBookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
