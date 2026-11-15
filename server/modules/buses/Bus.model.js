const mongoose = require('mongoose');

/**
 * Bus Model
 * Vehicles operated by transport providers
 */
const seatItemSchema = new mongoose.Schema(
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
    row: {
      type: Number,
      required: true,
      min: 1,
    },
    column: {
      type: Number,
      required: true,
      min: 1,
    },
    isLadiesOnly: {
      type: Boolean,
      default: false,
    },
    basePriceOffset: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: [true, 'Bus registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/,
        'Please enter a valid Indian vehicle registration number (e.g., KA01AB1234)',
      ],
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: [true, 'Bus operator is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Bus model/display name is required'],
      trim: true,
    },
    busType: {
      type: String,
      required: [true, 'Bus type is required'],
      enum: [
        'AC Sleeper',
        'Non-AC Sleeper',
        'AC Seater',
        'Non-AC Seater',
        'AC Sleeper / Seater Hybrid',
        'Volvo Multi-Axle',
      ],
      default: 'AC Seater',
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats count is required'],
      min: [10, 'Bus must have at least 10 seats'],
      max: [60, 'Bus cannot exceed 60 seats'],
    },
    layoutType: {
      type: String,
      enum: ['2x2', '2x1', '1x2', 'sleeper-2x1'],
      default: '2x2',
    },
    deckType: {
      type: String,
      enum: ['single', 'double'],
      default: 'single',
    },
    seatTemplate: {
      type: [seatItemSchema],
      default: [],
    },
    amenities: {
      type: [String],
      enum: [
        'WiFi',
        'Charging Point',
        'Water Bottle',
        'Blanket',
        'Pillow',
        'Reading Light',
        'Emergency Exit',
        'CCTV',
        'Live Tracking',
        'Snacks',
      ],
      default: ['Charging Point', 'Emergency Exit'],
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
busSchema.index({ busNumber: 1 });
busSchema.index({ operatorId: 1, status: 1 });

module.exports = mongoose.model('Bus', busSchema);
