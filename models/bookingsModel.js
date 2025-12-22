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

    totalPrice: {
      type: Number,
      required: [true, 'Total price is required']
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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
