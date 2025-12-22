const express = require('express');
const router = express.Router();

const {
  createBooking,
  getAllBookings,
  getMyBookings,
  updateBookingStatus,
  cancelBooking
} = require('../controllers/bookingsController');

const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);

// Admin
router.get('/', protect, authorize('admin'), getAllBookings);
router.put('/:id', protect, authorize('admin'), updateBookingStatus);

router.delete('/:id', protect, cancelBooking);

module.exports = router;
