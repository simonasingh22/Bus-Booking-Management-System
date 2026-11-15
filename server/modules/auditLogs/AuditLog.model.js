const mongoose = require('mongoose');

/**
 * Audit Log Model
 * Comprehensive immutable audit trail for security and material business actions
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'system',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTER',
        'USER_LOGIN',
        'USER_LOGOUT',
        'BUS_CREATE',
        'BUS_UPDATE',
        'BUS_DELETE',
        'ROUTE_CREATE',
        'ROUTE_UPDATE',
        'ROUTE_DELETE',
        'TRIP_CREATE',
        'TRIP_UPDATE',
        'TRIP_CANCEL',
        'SEAT_LOCK',
        'SEAT_RELEASE',
        'BOOKING_CREATE',
        'BOOKING_CONFIRM',
        'BOOKING_CANCEL',
        'PAYMENT_INITIATED',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'REFUND_PROCESSED',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'User',
        'Operator',
        'Bus',
        'Route',
        'Trip',
        'Seat',
        'Booking',
        'Payment',
        'Cancellation',
        'System',
      ],
      index: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
