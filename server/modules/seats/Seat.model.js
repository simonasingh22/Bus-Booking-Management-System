const mongoose = require('mongoose');

/**
 * Seat Model (TripSeat Inventory)
 * Tracks state, pricing, and locking of an individual seat for a specific trip.
 * Guarantees seat integrity and prevents duplicate bookings via compound unique index.
 */
const seatSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true,
      uppercase: true,
    },
    deck: {
      type: String,
      enum: ['lower', 'upper'],
      default: 'lower',
    },
    seatType: {
      type: String,
      enum: ['seater', 'sleeper'],
      default: 'seater',
    },
    row: {
      type: Number,
      required: true,
    },
    column: {
      type: Number,
      required: true,
    },
    fare: {
      type: Number,
      required: [true, 'Seat fare is required'],
      min: [0, 'Fare cannot be negative'],
    },
    status: {
      type: String,
      enum: ['available', 'locked', 'booked'],
      default: 'available',
      index: true,
    },
    // User who currently holds the temporary lock during checkout
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    // Temporary lock expiry (e.g., 10 minutes)
    lockExpiresAt: {
      type: Date,
      default: null,
    },
    // Confirmed booking reference
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    passenger: {
      name: { type: String, trim: true },
      age: { type: Number, min: 1, max: 120 },
      gender: { type: String, enum: ['male', 'female', 'other'] },
    },
    isLadiesOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Critical Unique Compound Index ──────────────────────────────
// Ensures that NO TWO DOCUMENTS can ever exist for the same seat on the same trip
seatSchema.index({ tripId: 1, seatNumber: 1 }, { unique: true });

// ─── Performance Indexes ─────────────────────────────────────────
seatSchema.index({ tripId: 1, status: 1 });
seatSchema.index({ lockExpiresAt: 1 });

module.exports = mongoose.model('Seat', seatSchema);
