const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required']
  }
}, {
  timestamps: true
});

// Ensure a user can only add a room to wishlist once
wishlistSchema.index({ user: 1, room: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
