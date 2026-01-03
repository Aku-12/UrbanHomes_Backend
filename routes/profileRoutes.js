const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All profile routes require authentication
router.use(protect);

// Get user profile
router.get('/me', profileController.getUserProfile);

// Update user profile
router.put('/me', profileController.updateUserProfile);

// Get user bookings
router.get('/bookings', profileController.getUserBookings);

// Upload profile picture
router.post('/avatar', upload.single('avatar'), profileController.uploadProfilePicture);

module.exports = router;module.exports = router;
