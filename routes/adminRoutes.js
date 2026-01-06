const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getRecentBookings,
  getAllRoomsAdmin,
  toggleRoomStatus,
  deleteRoomAdmin,
  getAllUsers,
  blockUser,
  unblockUser,
  getUserById,
  getAllBookingsAdmin,
  approveBooking,
  rejectBooking,
  deleteBookingAdmin,
  getBookingById,
  globalSearch
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-bookings', getRecentBookings);

// Global search
router.get('/search', globalSearch);

// Room management
router.get('/rooms', getAllRoomsAdmin);
router.patch('/rooms/:id/toggle-status', toggleRoomStatus);
router.delete('/rooms/:id', deleteRoomAdmin);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);

// Booking management
router.get('/bookings', getAllBookingsAdmin);
router.get('/bookings/:id', getBookingById);
router.patch('/bookings/:id/approve', approveBooking);
router.patch('/bookings/:id/reject', rejectBooking);
router.delete('/bookings/:id', deleteBookingAdmin);

module.exports = router;
