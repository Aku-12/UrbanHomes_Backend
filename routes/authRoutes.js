const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

// Password management routes
router.post('/forgot-password', authController.forgotPassword);
router.put('/change-password', authController.changePassword);
router.post('/verify-reset-code',  authController.verifyResetCode);
router.post('/reset-password',  authController.resetPassword);


module.exports = router;
