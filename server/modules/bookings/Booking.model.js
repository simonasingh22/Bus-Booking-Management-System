const mongoose = require('mongoose');
const { generatePNR } = require('../../utils/pnrGenerator');

/**
 * Passenger Subschema
 */
const passengerSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: true,
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
    name: {
      type: String,
      required: [true, 'Passenger name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Passenger age is required'],
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age cannot exceed 120'],
    },
    gender: {
      type: String,
      required: [true, 'Passenger gender is required'],
      enum: ['male', 'female', 'other'],
    },
    fare: {
      type: Number,
      required: true,
      min: [0, 'Fare cannot be negative'],
    },
  },
  { _id: false }
);

/**
 * Booking Model
 * Master record of a confirmed or pending bus reservation
 */
const bookingSchema = new mongoose.Schema(
  {
    pnr: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
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
      index: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: [true, 'Operator reference is required'],
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route reference is required'],
    },
    passengers: {
      type: [passengerSchema],
      required: [true, 'At least one passenger is required'],
      validate: [
        (arr) => arr.length > 0 && arr.length <= 6,
        'Booking must have between 1 and 6 passengers',
      ],
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    totalBaseFare: {
      type: Number,
      required: true,
      min: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    boardingPoint: {
      pointName: { type: String, required: true },
      landmark: { type: String, default: '' },
      time: { type: String, required: true },
    },
    droppingPoint: {
      pointName: { type: String, required: true },
      landmark: { type: String, default: '' },
      time: { type: String, required: true },
    },
    contactDetails: {
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid contact email'],
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Invalid 10-digit mobile number'],
      },
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: { type: Date, default: null },
      cancellationReason: { type: String, default: '' },
      refundAmount: { type: Number, default: 0 },
      cancellationCharge: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: ['none', 'pending', 'processed', 'failed'],
        default: 'none',
      },
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
bookingSchema.index({ pnr: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ tripId: 1, bookingStatus: 1 });
bookingSchema.index({ operatorId: 1, createdAt: -1 });

// ─── Auto-generate PNR ───────────────────────────────────────────
bookingSchema.pre('save', function () {
  if (!this.pnr) {
    this.pnr = generatePNR();
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
