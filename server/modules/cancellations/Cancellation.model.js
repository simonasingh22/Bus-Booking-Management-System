const mongoose = require('mongoose');

/**
 * Cancellation Model
 * Records booking cancellations, refund calculations, policy evaluation, and seat release
 */
const cancellationSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    pnr: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: [true, 'Operator reference is required'],
      index: true,
    },
    seatsCancelled: {
      type: [String],
      required: true,
    },
    totalBookingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    cancellationCharge: {
      type: Number,
      required: true,
      min: 0,
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'processed', // simulated refund in test mode
    },
    refundTransactionId: {
      type: String,
      default: () => `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    },
    reason: {
      type: String,
      trim: true,
      default: 'Customer requested cancellation',
    },
    policyDetails: {
      hoursBeforeDeparture: { type: Number },
      ruleApplied: { type: String },
    },
    cancellationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
cancellationSchema.index({ bookingId: 1 });
cancellationSchema.index({ pnr: 1 });
cancellationSchema.index({ userId: 1, createdAt: -1 });
cancellationSchema.index({ operatorId: 1, createdAt: -1 });

module.exports = mongoose.model('Cancellation', cancellationSchema);
