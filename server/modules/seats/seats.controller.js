const Seat = require('./Seat.model');
const Trip = require('../trips/Trip.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Get all seats for a trip with automatic expired lock clearance
 * @route   GET /api/seats/trip/:tripId
 * @access  Public
 */
const getSeatsByTrip = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  // Auto-release expired locks on read
  const now = new Date();
  await Seat.updateMany(
    { tripId, status: 'locked', lockExpiresAt: { $lt: now } },
    { status: 'available', lockedBy: null, lockedAt: null, lockExpiresAt: null }
  );

  const seats = await Seat.find({ tripId }).sort({ deck: 1, row: 1, column: 1 });

  // Compute live seat metrics
  const availableCount = seats.filter((s) => s.status === 'available').length;
  const lockedCount = seats.filter((s) => s.status === 'locked').length;
  const bookedCount = seats.filter((s) => s.status === 'booked').length;

  sendSuccess(res, 200, 'Seats retrieved successfully.', {
    tripId,
    total: seats.length,
    counts: {
      available: availableCount,
      locked: lockedCount,
      booked: bookedCount,
    },
    seats,
  });
});

/**
 * @desc    Temporarily lock seats during checkout (Atomic Concurrency Protection)
 * @route   POST /api/seats/lock
 * @access  Private (Authenticated User)
 */
const lockSeats = asyncHandler(async (req, res, next) => {
  const { tripId, seatNumbers } = req.body;

  if (!tripId || !seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return next(new AppError('Please provide tripId and an array of seatNumbers to lock.', 400));
  }

  if (seatNumbers.length > 6) {
    return next(new AppError('You can select a maximum of 6 seats per transaction.', 400));
  }

  const trip = await Trip.findById(tripId);
  if (!trip || trip.status !== 'scheduled') {
    return next(new AppError('Trip is no longer accepting new bookings.', 400));
  }

  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes lock

  const successfullyLocked = [];

  // Atomic lock attempt for each seat
  for (const seatNum of seatNumbers) {
    const lockedDoc = await Seat.findOneAndUpdate(
      {
        tripId,
        seatNumber: seatNum.trim().toUpperCase(),
        $or: [
          { status: 'available' },
          { status: 'locked', lockExpiresAt: { $lt: now } }, // expired lock takeover
          { status: 'locked', lockedBy: req.user._id }, // re-lock / extend by same user
        ],
      },
      {
        status: 'locked',
        lockedBy: req.user._id,
        lockedAt: now,
        lockExpiresAt,
      },
      { new: true }
    );

    if (!lockedDoc) {
      // Concurrency conflict! Rollback any seats locked so far in this batch
      if (successfullyLocked.length > 0) {
        await Seat.updateMany(
          { tripId, seatNumber: { $in: successfullyLocked } },
          { status: 'available', lockedBy: null, lockedAt: null, lockExpiresAt: null }
        );
      }
      return next(
        new AppError(
          `Seat ${seatNum} was just selected by another passenger. Please choose an available seat.`,
          409 // HTTP 409 Conflict
        )
      );
    }

    successfullyLocked.push(seatNum.trim().toUpperCase());
  }

  await logAuditAction({
    req,
    action: 'SEAT_LOCK',
    entityType: 'Seat',
    entityId: tripId,
    details: { seats: successfullyLocked, lockExpiresAt },
  });

  sendSuccess(res, 200, 'Seats locked successfully for 10 minutes.', {
    tripId,
    lockedSeats: successfullyLocked,
    lockExpiresAt,
  });
});

/**
 * @desc    Release locked seats (User deselects or checkout abandoned)
 * @route   POST /api/seats/release
 * @access  Private (Authenticated User)
 */
const releaseSeats = asyncHandler(async (req, res, next) => {
  const { tripId, seatNumbers } = req.body;

  if (!tripId || !seatNumbers || !Array.isArray(seatNumbers)) {
    return next(new AppError('Please provide tripId and seatNumbers.', 400));
  }

  const query = {
    tripId,
    seatNumber: { $in: seatNumbers.map((s) => s.trim().toUpperCase()) },
    status: 'locked',
  };

  // Only the user who locked it or admin can release it
  if (req.user.role !== 'admin') {
    query.lockedBy = req.user._id;
  }

  await Seat.updateMany(query, {
    status: 'available',
    lockedBy: null,
    lockedAt: null,
    lockExpiresAt: null,
  });

  await logAuditAction({
    req,
    action: 'SEAT_RELEASE',
    entityType: 'Seat',
    entityId: tripId,
    details: { seats: seatNumbers },
  });

  sendSuccess(res, 200, 'Seats released successfully.', { tripId, releasedSeats: seatNumbers });
});

module.exports = {
  getSeatsByTrip,
  lockSeats,
  releaseSeats,
};
