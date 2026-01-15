const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  // Optional detailed ratings
  cleanliness: {
    type: Number,
    min: 1,
    max: 5
  },
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  location: {
    type: Number,
    min: 1,
    max: 5
  },
  value: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Ensure one review per booking
reviewSchema.index({ booking: 1 }, { unique: true });
// Index for room reviews lookup
reviewSchema.index({ room: 1, createdAt: -1 });
// Index for user reviews lookup
reviewSchema.index({ user: 1, createdAt: -1 });

// Static method to calculate average rating for a room
reviewSchema.statics.calcAverageRating = async function(roomId) {
  const stats = await this.aggregate([
    { $match: { room: roomId } },
    {
      $group: {
        _id: '$room',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  const Room = mongoose.model('Room');
  if (stats.length > 0) {
    await Room.findByIdAndUpdate(roomId, {
      rating: {
        average: Math.round(stats[0].avgRating * 10) / 10,
        count: stats[0].numReviews
      }
    });
  } else {
    await Room.findByIdAndUpdate(roomId, {
      rating: {
        average: 0,
        count: 0
      }
    });
  }
};

// Update room rating after saving a review
reviewSchema.post('save', function() {
  this.constructor.calcAverageRating(this.room);
});

// Update room rating after removing a review
reviewSchema.post('findOneAndDelete', function(doc) {
  if (doc) {
    doc.constructor.calcAverageRating(doc.room);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
