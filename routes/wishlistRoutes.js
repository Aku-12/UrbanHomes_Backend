const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

// All wishlist routes require authentication
router.use(protect);

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Add room to wishlist
router.post('/', wishlistController.addToWishlist);

// Toggle wishlist (add/remove)
router.post('/toggle/:roomId', wishlistController.toggleWishlist);

// Check if room is in wishlist
router.get('/check/:roomId', wishlistController.checkWishlist);

// Remove room from wishlist
router.delete('/:roomId', wishlistController.removeFromWishlist);

module.exports = router;
