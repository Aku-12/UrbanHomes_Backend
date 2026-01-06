const axios = require('axios');
const Booking = require('../models/bookingsModel');
const { createPaymentPayload, generateSignature } = require('../utils/esewa');
const crypto = require('crypto');

/**
 * Initiate eSewa payment
 * POST /api/payment/esewa/initiate
 */
exports.initiateEsewaPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking belongs to user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this booking'
      });
    }

    // Check if already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    // Generate unique transaction UUID (alphanumeric and hyphen only as per eSewa docs)
    const timestamp = Date.now().toString();
    const bookingIdShort = booking._id.toString().slice(-8);
    const transactionUuid = `UH-${bookingIdShort}-${timestamp}`;

    // Save transaction UUID to booking
    booking.esewaTransaction = {
      transactionUuid,
      amount: booking.totalPrice
    };
    await booking.save();

    // Development mode - skip eSewa and simulate payment
    const isDev = process.env.ESEWA_DEV_MODE === 'true';
    
    if (isDev) {
      // Create mock successful response data
      const mockResponse = {
        transaction_code: `MOCK-${Date.now()}`,
        status: 'COMPLETE',
        total_amount: booking.totalPrice.toString(),
        transaction_uuid: transactionUuid,
        product_code: process.env.ESEWA_MERCHANT_CODE,
        signed_field_names: 'transaction_code,status,total_amount,transaction_uuid,product_code',
        signature: 'mock_signature'
      };
      
      const mockData = Buffer.from(JSON.stringify(mockResponse)).toString('base64');
      
      return res.status(200).json({
        success: true,
        message: 'Dev mode - payment simulation enabled',
        devMode: true,
        mockData,
        paymentUrl: process.env.ESEWA_PAYMENT_URL,
        paymentData: createPaymentPayload({
          amount: booking.totalPrice,
          taxAmount: 0,
          serviceCharge: 0,
          deliveryCharge: 0,
          transactionUuid,
          productCode: process.env.ESEWA_MERCHANT_CODE
        })
      });
    }

    // Create eSewa payment payload
    const paymentData = createPaymentPayload({
      amount: booking.totalPrice,
      taxAmount: 0,
      serviceCharge: 0,
      deliveryCharge: 0,
      transactionUuid,
      productCode: process.env.ESEWA_MERCHANT_CODE
    });

    res.status(200).json({
      success: true,
      message: 'Payment initiated',
      paymentUrl: process.env.ESEWA_PAYMENT_URL,
      paymentData
    });

  } catch (error) {
    console.error('eSewa initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Verify eSewa payment after callback
 * POST /api/payment/esewa/verify
 */
exports.verifyEsewaPayment = async (req, res) => {
  try {
    const { data } = req.body; // Base64 encoded response from eSewa

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Payment data is required'
      });
    }

    // Decode base64 response
    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    console.log('eSewa decoded response:', decodedData);

    const { 
      transaction_uuid, 
      status, 
      total_amount, 
      transaction_code,
      signed_field_names,
      signature
    } = decodedData;

    // Find booking by transaction UUID
    const booking = await Booking.findOne({
      'esewaTransaction.transactionUuid': transaction_uuid
    }).populate('room');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found for this transaction'
      });
    }

    // Check if this is a mock/dev payment
    const isMockPayment = transaction_code && transaction_code.startsWith('MOCK-');
    
    // Verify signature only for real payments
    if (!isMockPayment && signed_field_names && signature) {
      const fields = signed_field_names.split(',');
      const message = fields.map(field => `${field}=${decodedData[field]}`).join(',');
      const expectedSignature = generateSignature(message);
      
      if (expectedSignature !== signature) {
        console.error('Signature mismatch:', { expected: expectedSignature, received: signature });
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
    }

    // Check payment status
    if (status !== 'COMPLETE') {
      return res.status(400).json({
        success: false,
        message: `Payment ${status.toLowerCase()}`
      });
    }

    // Verify amount matches
    const expectedAmount = booking.totalPrice;
    const paidAmount = parseFloat(total_amount);

    if (paidAmount < expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }

    // Verify payment with eSewa API (skip for mock payments)
    if (!isMockPayment) {
      try {
        const verifyResponse = await axios.get(process.env.ESEWA_VERIFY_URL, {
          params: {
            product_code: process.env.ESEWA_MERCHANT_CODE,
            total_amount: total_amount,
            transaction_uuid: transaction_uuid
          }
        });

        console.log('eSewa verification response:', verifyResponse.data);

        if (verifyResponse.data.status !== 'COMPLETE') {
          return res.status(400).json({
            success: false,
            message: 'Payment verification failed'
          });
        }
      } catch (verifyError) {
        console.error('eSewa verification API error:', verifyError.response?.data || verifyError.message);
        // Continue if verification API fails in test environment
        if (process.env.NODE_ENV === 'production') {
          return res.status(400).json({
            success: false,
            message: 'Payment verification failed'
          });
        }
      }
    }

    // Update booking status
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.esewaTransaction.refId = transaction_code;
    booking.esewaTransaction.paidAt = new Date();
    await booking.save();

    // Update room status
    if (booking.room) {
      booking.room.status = 'rented';
      await booking.room.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      booking: {
        _id: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalPrice: booking.totalPrice,
        startDate: booking.startDate,
        endDate: booking.endDate,
        duration: booking.duration,
        roomTitle: booking.room?.title || 'Room',
        esewaTransaction: booking.esewaTransaction
      }
    });

  } catch (error) {
    console.error('eSewa verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get payment status
 * GET /api/payment/status/:bookingId
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select('paymentStatus status totalPrice esewaTransaction');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      payment: {
        status: booking.paymentStatus,
        bookingStatus: booking.status,
        totalPrice: booking.totalPrice,
        transaction: booking.esewaTransaction
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
