const Cancellation = require('./Cancellation.model');
const Booking = require('../bookings/Booking.model');
const Payment = require('../payments/Payment.model');
const Trip = require('../trips/Trip.model');
const Seat = require('../seats/Seat.model');
const Operator = require('../operators/Operator.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * Helper to compute refund according to operator policy and hours left
 */
const evaluateCancellationPolicy = (departureDate, departureTime, policy, totalAmount) => {
  const [hours, minutes] = (departureTime || '00:00').split(':').map(Number);
  const departureDateTime = new Date(departureDate);
  departureDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const diffMs = departureDateTime.getTime() - now.getTime();
  const hoursBefore = diffMs / (1000 * 60 * 60);

  const fullHours = policy?.fullRefundHours ?? 24;
  const partialHours = policy?.partialRefundHours ?? 12;
  const noRefundHours = policy?.noRefundHours ?? 4;
  const standardFeePercent = policy?.cancellationChargePercent ?? 10;

  let refundPercent = 0;
  let ruleApplied = '';

  if (hoursBefore >= fullHours) {
    refundPercent = 100 - standardFeePercent; // e.g., 90% refund
    ruleApplied = `More than ${fullHours} hrs before departure (${refundPercent}% refund, ${standardFeePercent}% service charge)`;
  } else if (hoursBefore >= partialHours) {
    refundPercent = 50; // 50% refund
    ruleApplied = `Between ${partialHours} and ${fullHours} hrs before departure (50% refund)`;
  } else if (hoursBefore >= noRefundHours) {
    refundPercent = 25; // 25% refund
    ruleApplied = `Between ${noRefundHours} and ${partialHours} hrs before departure (25% refund)`;
  } else {
    refundPercent = 0; // 0% refund
    ruleApplied = `Less than ${noRefundHours} hrs before departure (Non-refundable)`;
  }

  const refundAmount = Math.round((totalAmount * refundPercent) / 100);
  const cancellationCharge = totalAmount - refundAmount;

  return {
    hoursBeforeDeparture: Math.max(0, Math.round(hoursBefore * 10) / 10),
    refundPercentage: refundPercent,
    cancellationCharge,
    refundAmount,
    ruleApplied,
  };
};

const simulateRefund = (amount) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Simulated refund amount must be greater than zero.');
  }
  return `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const applyRefundToPayment = (payment, refundAmount, refundTransactionId, processedAt = new Date()) => {
  if (!payment || payment.status !== 'captured') {
    throw new Error('A captured payment is required before processing this refund.');
  }
  payment.status = 'refunded';
  payment.refund = {
    refundId: refundTransactionId,
    amount: refundAmount,
    status: 'processed',
    processedAt,
  };
  return payment;
};

/**
 * @desc    Preview refund calculation before user confirms
 * @route   GET /api/cancellations/estimate/:bookingId
 * @access  Private
 */
const estimateRefund = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate('tripId')
    .populate('operatorId');

  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  if (booking.bookingStatus === 'cancelled') {
    return next(new AppError('This booking has already been cancelled.', 400));
  }

  const trip = booking.tripId;
  const operator = booking.operatorId;

  const estimate = evaluateCancellationPolicy(
    trip.departureDate,
    trip.departureTime,
    operator?.cancellationPolicy,
    booking.totalAmount
  );

  sendSuccess(res, 200, 'Cancellation refund estimate calculated.', {
    bookingId: booking._id,
    pnr: booking.pnr,
    totalBookingAmount: booking.totalAmount,
    estimate,
  });
});

/**
 * @desc    Cancel booking, process simulated refund, and release seats
 * @route   POST /api/cancellations
 * @access  Private
 */
const cancelBooking = asyncHandler(async (req, res, next) => {
  const { bookingId, reason } = req.body;

  if (!bookingId) {
    return next(new AppError('Please provide bookingId to cancel.', 400));
  }

  const booking = await Booking.findById(bookingId)
    .populate('tripId')
    .populate('operatorId');

  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  // Access check: Only booking owner or admin can cancel
  if (
    req.user.role === 'customer' &&
    booking.userId.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('You do not have permission to cancel this booking.', 403));
  }

  const existingCancellation = await Cancellation.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
  if (existingCancellation) {
    if (booking.bookingStatus === 'cancelled') {
      return sendSuccess(res, 200, 'Booking cancellation already processed.', {
        cancellation: existingCancellation,
        booking,
        duplicate: true,
      });
    }
    return next(new AppError('Cancellation is already being processed for this booking.', 409));
  }

  if (booking.bookingStatus === 'cancelled') {
    return next(new AppError('This booking has already been cancelled.', 400));
  }

  const trip = booking.tripId;
  const operator = booking.operatorId;

  // 1. Calculate Refund Policy
  const {
    hoursBeforeDeparture,
    refundPercentage,
    cancellationCharge,
    refundAmount,
    ruleApplied,
  } = evaluateCancellationPolicy(
    trip.departureDate,
    trip.departureTime,
    operator?.cancellationPolicy,
    booking.totalAmount
  );

  const payment = await Payment.findOne({ bookingId: booking._id });
  let refundTransactionId = null;
  if (refundAmount > 0) {
    if (!payment || payment.status !== 'captured') {
      return next(new AppError('A captured payment is required before processing this refund.', 409));
    }
    try {
      // Test-mode refund: this creates no external gateway request.
      refundTransactionId = simulateRefund(refundAmount);
    } catch (error) {
      return next(new AppError(error.message, 502));
    }
  }

  const seatNumbersToRelease = booking.passengers.map((p) => p.seatNumber);

  // Create a pending record before changing financial state. If a later write fails,
  // retries cannot issue a second refund and the pending record remains auditable.
  const cancellation = await Cancellation.create({
    bookingId: booking._id,
    pnr: booking.pnr,
    userId: booking.userId,
    tripId: trip._id,
    operatorId: booking.operatorId._id,
    seatsCancelled: seatNumbersToRelease,
    totalBookingAmount: booking.totalAmount,
    cancellationCharge,
    refundAmount,
    refundPercentage,
    refundStatus: refundAmount > 0 ? 'pending' : 'processed',
    ...(refundTransactionId ? { refundTransactionId } : {}),
    reason: reason || 'Customer requested cancellation',
    policyDetails: {
      hoursBeforeDeparture,
      ruleApplied,
    },
    cancellationDate: new Date(),
  });

  if (refundAmount > 0) {
    applyRefundToPayment(payment, refundAmount, refundTransactionId);
    await payment.save();
  }

  // Release seats only after the simulated refund has succeeded.
  await Seat.updateMany(
    {
      tripId: trip._id,
      seatNumber: { $in: seatNumbersToRelease },
    },
    {
      status: 'available',
      bookingId: null,
      passenger: null,
      lockedBy: null,
      lockedAt: null,
      lockExpiresAt: null,
    }
  );

  // 3. Increment Available Seats on Trip
  trip.availableSeats = Math.min(trip.totalSeats, trip.availableSeats + seatNumbersToRelease.length);
  await trip.save();

  // Update booking financial state without changing the original total amount.
  booking.bookingStatus = 'cancelled';
  if (refundAmount > 0) {
    booking.paymentStatus = refundAmount >= booking.totalAmount ? 'refunded' : 'partially_refunded';
  }
  booking.cancellation = {
    isCancelled: true,
    cancelledAt: new Date(),
    cancellationReason: reason || 'Customer requested cancellation',
    refundAmount,
    cancellationCharge,
    refundStatus: refundAmount > 0 ? 'processed' : 'none',
  };
  await booking.save();

  cancellation.refundStatus = refundAmount > 0 ? 'processed' : 'processed';
  await cancellation.save();

  // Record immutable audit actions only once, after the cancellation is consistent.
  await logAuditAction({
    req,
    action: 'BOOKING_CANCEL',
    entityType: 'Booking',
    entityId: booking._id,
    details: {
      pnr: booking.pnr,
      originalAmount: booking.totalAmount,
      seatsReleased: seatNumbersToRelease,
      refundAmount,
      cancellationCharge,
      refundReference: refundTransactionId,
      ruleApplied,
    },
  });

  if (refundAmount > 0) {
    await logAuditAction({
      req,
      action: 'REFUND_PROCESSED',
      entityType: 'Cancellation',
      entityId: cancellation._id,
      details: {
        refundTransactionId: cancellation.refundTransactionId,
        amount: refundAmount,
        pnr: booking.pnr,
        originalAmount: booking.totalAmount,
        cancellationCharge,
        refundReference: refundTransactionId,
      },
    });
  }

  sendSuccess(res, 200, 'Booking cancelled and seats released successfully.', {
    cancellation,
    booking,
  });
});

/**
 * @desc    Get user's cancellation & refund history
 * @route   GET /api/cancellations/my-cancellations
 * @access  Private
 */
const getMyCancellations = asyncHandler(async (req, res) => {
  const cancellations = await Cancellation.find({ userId: req.user._id })
    .populate('operatorId', 'name')
    .populate('tripId', 'departureDate departureTime')
    .sort({ cancellationDate: -1 });

  sendSuccess(res, 200, 'Cancellation history retrieved.', {
    count: cancellations.length,
    cancellations,
  });
});

module.exports = {
  estimateRefund,
  cancelBooking,
  getMyCancellations,
  evaluateCancellationPolicy,
  simulateRefund,
  applyRefundToPayment,
};
