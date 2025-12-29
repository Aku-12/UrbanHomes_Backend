const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required for booking']
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for booking']
    },

    // Renter Information
    renterInfo: {
      firstName: {
        type: String,
        required: [true, 'First name is required']
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required']
      },
      email: {
        type: String,
        required: [true, 'Email is required']
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required']
      },
      numberOfOccupants: {
        type: Number,
        default: 1,
        min: 1
      }
    },

    bookingDate: {
      type: Date,
      default: Date.now
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },

    // Duration in months
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: 1
    },

    // Price breakdown
    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required']
    },

    securityDeposit: {
      type: Number,
      required: [true, 'Security deposit is required']
    },

    serviceFee: {
      type: Number,
      default: 100
    },

    totalPrice: {
      type: Number,
      required: [true, 'Total price is required']
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ['esewa', 'cash'],
      default: 'esewa'
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid'
    },

    // Promo code
    promoCode: {
      type: String,
      default: null
    },

    discount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
