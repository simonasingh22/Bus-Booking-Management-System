const mongoose = require('mongoose');

/**
 * Payment Model
 * Tracks transaction status, Razorpay order/payment IDs, and refund audit details
 */
const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'test_simulation'],
      default: 'razorpay',
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    refund: {
      refundId: { type: String, default: null },
      amount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['none', 'pending', 'processed', 'failed'],
        default: 'none',
      },
      processedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
