const express = require('express');
const router = express.Router();

const {
  initiateEsewaPayment,
  verifyEsewaPayment,
  getPaymentStatus
} = require('../controllers/paymentController');

const { protect } = require('../middleware/authMiddleware');

// Initiate eSewa payment
router.post('/esewa/initiate', protect, initiateEsewaPayment);

// Verify eSewa payment 
router.post('/esewa/verify', verifyEsewaPayment);

// Get payment status
router.get('/status/:bookingId', protect, getPaymentStatus);

module.exports = router;
