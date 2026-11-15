const mongoose = require('mongoose');

/**
 * Trip Model
 * Scheduled bus journey for a given route, date, and bus
 */
const boardDropPointSchema = new mongoose.Schema(
  {
    pointName: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    time: {
      type: String,
      required: true, // "HH:MM" e.g., "21:30"
      trim: true,
    },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    tripCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus assignment is required'],
      index: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: [true, 'Operator assignment is required'],
      index: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route assignment is required'],
      index: true,
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required'],
      index: true,
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time (HH:mm) is required'],
    },
    arrivalDate: {
      type: Date,
      required: [true, 'Arrival date is required'],
    },
    arrivalTime: {
      type: String,
      required: [true, 'Arrival time (HH:mm) is required'],
    },
    fares: {
      seater: {
        type: Number,
        required: [true, 'Seater fare is required'],
        min: [0, 'Fare cannot be negative'],
      },
      sleeper: {
        type: Number,
        default: 0,
        min: [0, 'Fare cannot be negative'],
      },
    },
    boardingPoints: {
      type: [boardDropPointSchema],
      default: [],
    },
    droppingPoints: {
      type: [boardDropPointSchema],
      default: [],
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'boarding', 'in-transit', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
tripSchema.index({ routeId: 1, departureDate: 1, status: 1 });
tripSchema.index({ operatorId: 1, departureDate: 1 });
tripSchema.index({ busId: 1, departureDate: 1 });

// ─── Auto-generate Trip Code ─────────────────────────────────────
tripSchema.pre('save', function () {
  if (!this.tripCode) {
    const d = new Date(this.departureDate);
    const dateStr =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.tripCode = `TRIP-${dateStr}-${randomHex}`;
  }
});

module.exports = mongoose.model('Trip', tripSchema);
