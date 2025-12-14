const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', roomController.getAllRooms);
router.get('/rooms', roomController.getAllRooms);
router.get('/popular', roomController.getPopularRooms);
router.get('/featured', roomController.getFeaturedRooms);
router.get('/search', roomController.searchRooms);
router.get('/cities', roomController.getCities);
router.get('/:id', roomController.getRoomById);

// Protected routes (require authentication)
router.post('/', protect, roomController.createRoom);
router.get('/user/my-rooms', protect, roomController.getMyRooms);
router.put('/:id', protect, roomController.updateRoom);
router.delete('/:id', protect, roomController.deleteRoom);

module.exports = router;
