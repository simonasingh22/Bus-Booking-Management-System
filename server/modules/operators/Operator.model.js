const mongoose = require('mongoose');

/**
 * Operator Model
 * Bus transport companies providing fleet services
 */
const operatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Operator name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Operator name must be at least 2 characters'],
      maxlength: [100, 'Operator name cannot exceed 100 characters'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
    },
    licenseNumber: {
      type: String,
      required: [true, 'Commercial transport license number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, trim: true },
    },
    logo: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating cannot exceed 5.0'],
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cancellationPolicy: {
      fullRefundHours: {
        type: Number,
        default: 24, // >= 24 hrs before departure: 90% refund (10% fee)
      },
      partialRefundHours: {
        type: Number,
        default: 12, // 12 to 24 hrs before departure: 50% refund
      },
      noRefundHours: {
        type: Number,
        default: 4, // < 4 hrs before departure: 0% refund
      },
      cancellationChargePercent: {
        type: Number,
        default: 10,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
operatorSchema.index({ name: 1 });
operatorSchema.index({ licenseNumber: 1 });
operatorSchema.index({ isActive: 1 });

module.exports = mongoose.model('Operator', operatorSchema);
