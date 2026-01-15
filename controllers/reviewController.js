const Review = require('../models/reviewModel');
const Booking = require('../models/bookingsModel');
const Room = require('../models/roomModel');

// Create a review for a booking
exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment, cleanliness, communication, location, value } = req.body;
    const userId = req.user._id;

    // Check if booking exists and belongs to the user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'You can only review confirmed bookings'
      });
    }

    // Check if already reviewed
    if (booking.hasReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Create the review
    const review = await Review.create({
      room: booking.room,
      user: userId,
      booking: bookingId,
      rating,
      comment,
      cleanliness,
      communication,
      location,
      value
    });

    // Mark booking as reviewed
    booking.hasReview = true;
    await booking.save();

    // Populate user info for response
    await review.populate('user', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get reviews for a room
exports.getRoomReviews = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const reviews = await Review.find({ room: roomId })
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ room: roomId });

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { room: room._id } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        ratingDistribution,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
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

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    const reviews = await Review.find({ user: userId })
      .populate('room', 'title images location price')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, cleanliness, communication, location, value } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    if (cleanliness) review.cleanliness = cleanliness;
    if (communication) review.communication = communication;
    if (location) review.location = location;
    if (value) review.value = value;

    await review.save();

    await review.populate('user', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review or is admin
    if (review.user.toString() !== userId.toString() && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    // Update booking to allow new review
    await Booking.findByIdAndUpdate(review.booking, { hasReview: false });

    await Review.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Check if user can review a booking
exports.canReviewBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const canReview =
      booking.user.toString() === userId.toString() &&
      booking.status === 'confirmed' &&
      !booking.hasReview;

    res.status(200).json({
      success: true,
      canReview,
      hasReview: booking.hasReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
