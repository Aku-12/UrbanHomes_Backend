const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Room title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Room description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  roomType: {
    type: String,
    required: [true, 'Room type is required'],
    enum: ['Studio', 'Private', 'Shared', '1BHK', '2BHK', '3BHK', 'Apartment']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  size: {
    type: Number,
    required: [true, 'Size in sqft is required'],
    min: [0, 'Size cannot be negative']
  },
  beds: {
    type: Number,
    default: 1,
    min: [0, 'Beds cannot be negative']
  },
  bathrooms: {
    type: Number,
    default: 1,
    min: [0, 'Bathrooms cannot be negative']
  },
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      }
    }
  },
  amenities: {
    wifi: { type: Boolean, default: false },
    airConditioning: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    laundry: { type: Boolean, default: false },
    furnished: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    tv: { type: Boolean, default: false },
    kitchen: { type: Boolean, default: false },
    balcony: { type: Boolean, default: false },
    security: { type: Boolean, default: false }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String
    }
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'pending', 'inactive'],
    default: 'available'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  views: {
    type: Number,
    default: 0
  },
  availableFrom: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for location-based queries
roomSchema.index({ 'location.city': 1, 'location.area': 1 });
roomSchema.index({ price: 1 });
roomSchema.index({ roomType: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ isFeatured: -1, createdAt: -1 });

// Virtual for formatted price
roomSchema.virtual('formattedPrice').get(function() {
  return `Rs ${this.price.toLocaleString()}`;
});

// Ensure virtuals are included in JSON output
roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);
