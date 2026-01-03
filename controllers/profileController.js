const User = require('../models/userModel');
const Booking = require('../models/bookingsModel');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get bookings count
    const bookingsCount = await Booking.countDocuments({ user: req.user.id });

    // Get wishlist count (if wishlist field exists in user model)
    const wishlistCount = user.wishlist ? user.wishlist.length : 0;

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          bookings: bookingsCount,
          saved: wishlistCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, streetAddress, city } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.user.id } 
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        email: email ? email.toLowerCase() : undefined,
        phone,
        address: {
          street: streetAddress,
          city
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find({ user: req.user.id })
      .populate('room', 'title location price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBookings: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Create the file path that will be accessible via API
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    console.log('Uploading avatar:', {
      filename: req.file.filename,
      path: avatarPath,
      userId: req.user.id
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarPath },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
