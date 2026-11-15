const mongoose = require('mongoose');

/**
 * Route Model
 * Transit corridor between source and destination with intermediate stops
 */
const stopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: [true, 'Stop name is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Stop city is required'],
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    stopType: {
      type: String,
      enum: ['boarding', 'dropping', 'both'],
      default: 'both',
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    distanceFromSourceKm: {
      type: Number,
      default: 0,
    },
    durationOffsetMinutes: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    sourceCity: {
      type: String,
      required: [true, 'Source city is required'],
      trim: true,
      index: true,
    },
    sourceState: {
      type: String,
      required: [true, 'Source state is required'],
      trim: true,
    },
    destinationCity: {
      type: String,
      required: [true, 'Destination city is required'],
      trim: true,
      index: true,
    },
    destinationState: {
      type: String,
      required: [true, 'Destination state is required'],
      trim: true,
    },
    distanceKm: {
      type: Number,
      required: [true, 'Distance in km is required'],
      min: [1, 'Distance must be at least 1 km'],
    },
    estimatedDurationMinutes: {
      type: Number,
      required: [true, 'Estimated duration in minutes is required'],
      min: [10, 'Duration must be at least 10 minutes'],
    },
    stops: {
      type: [stopSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
routeSchema.index({ sourceCity: 1, destinationCity: 1, isActive: 1 });

// ─── Virtuals ────────────────────────────────────────────────────
routeSchema.virtual('durationFormatted').get(function () {
  if (!this.estimatedDurationMinutes) return '0 hrs';
  const hours = Math.floor(this.estimatedDurationMinutes / 60);
  const mins = this.estimatedDurationMinutes % 60;
  return `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim();
});

module.exports = mongoose.model('Route', routeSchema);
