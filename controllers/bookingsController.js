const Booking = require('../models/bookingsModel');
const Room = require('../models/roomModel');

exports.createBooking = async (req, res) => {
  try {
    const { roomId, startDate, endDate } = req.body;

    // Validate room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check room availability
    if (room.status !== 'available') {
      return res.status(400).json({ message: 'Room is not available for booking' });
    }

    // Validate booking dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        message: 'End date must be after start date'
      });
    }

    if (room.availableFrom && start < new Date(room.availableFrom)) {
      return res.status(400).json({
        message: 'Room is not available from the selected start date'
      });
    }

    // Check overlapping bookings
    // Two date ranges overlap if: (A.start < B.end) AND (A.end > B.start)
    const existingBooking = await Booking.findOne({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      startDate: { $lt: end },
      endDate: { $gt: start }
    });

    if (existingBooking) {
      return res.status(409).json({
        message: 'Room already booked for the selected dates'
      });
    }

    // Calculate total price (monthly based)
    const totalPrice = room.price;

    const booking = await Booking.create({
      room: roomId,
      user: req.user.id,
      startDate: start,
      endDate: end,
      totalPrice,
      status: 'pending'
    });

    // Update room status
    room.status = 'pending';
    await room.save();

    res.status(201).json({
      success: true,
      booking
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('room', 'title price location status')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('room', 'title price location images status');

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;

    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update booking
    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();

    // Sync room status
    if (status === 'confirmed') {
      booking.room.status = 'rented';
    }

    if (status === 'cancelled') {
      booking.room.status = 'available';
    }

    await booking.room.save();

    res.status(200).json({
      success: true,
      booking
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Authorization check
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Restore room availability
    booking.room.status = 'available';
    await booking.room.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
