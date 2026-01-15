const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/room/:roomId', reviewController.getRoomReviews);

// Protected routes
router.post('/', protect, reviewController.createReview);
router.get('/my-reviews', protect, reviewController.getUserReviews);
router.get('/can-review/:bookingId', protect, reviewController.canReviewBooking);
router.put('/:id', protect, reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);

module.exports = router;
