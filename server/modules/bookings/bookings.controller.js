const Booking = require('./Booking.model');
const Trip = require('../trips/Trip.model');
const Seat = require('../seats/Seat.model');
const Payment = require('../payments/Payment.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Create a confirmed bus booking (Passenger Journey & Concurrency Check)
 * @route   POST /api/bookings
 * @access  Private (Authenticated User)
 */
const createBooking = asyncHandler(async (req, res, next) => {
  const {
    tripId,
    passengers,
    boardingPoint,
    droppingPoint,
    contactDetails,
    idempotencyKey,
    paymentMethod = 'razorpay',
    razorpayPaymentId,
    razorpayOrderId,
  } = req.body;

  // 1. Idempotency Check (prevents duplicate submission on network retries)
  if (idempotencyKey) {
    const existingBooking = await Booking.findOne({ idempotencyKey })
      .populate('tripId')
      .populate('busId')
      .populate('operatorId')
      .populate('routeId');

    if (existingBooking) {
      return sendSuccess(res, 200, 'Existing booking returned (idempotent).', {
        booking: existingBooking,
      });
    }
  }

  // 2. Validate Inputs
  if (!tripId || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
    return next(new AppError('Please provide tripId and a list of passengers.', 400));
  }

  if (passengers.length > 6) {
    return next(new AppError('Maximum of 6 passengers permitted per booking.', 400));
  }

  if (!boardingPoint || !droppingPoint || !contactDetails) {
    return next(new AppError('Please provide boardingPoint, droppingPoint, and contactDetails.', 400));
  }

  const trip = await Trip.findById(tripId);
  if (!trip || trip.status !== 'scheduled') {
    return next(new AppError('This trip is not open for new bookings.', 400));
  }

  const now = new Date();
  const seatNumbers = passengers.map((p) => p.seatNumber.trim().toUpperCase());

  // 3. Concurrency & Seat Integrity Check
  const seats = await Seat.find({
    tripId,
    seatNumber: { $in: seatNumbers },
  });

  if (seats.length !== seatNumbers.length) {
    return next(new AppError('One or more selected seats do not exist on this bus.', 400));
  }

  for (const s of seats) {
    if (s.status === 'booked') {
      return next(
        new AppError(
          `Seat ${s.seatNumber} has already been confirmed by another passenger.`,
          409 // Conflict
        )
      );
    }

    // If locked, must be locked by the CURRENT user and not expired
    if (
      s.status === 'locked' &&
      s.lockedBy &&
      s.lockedBy.toString() !== req.user._id.toString() &&
      s.lockExpiresAt > now
    ) {
      return next(
        new AppError(
          `Seat ${s.seatNumber} is temporarily reserved by another passenger.`,
          409 // Conflict
        )
      );
    }
  }

  // 4. Calculate Fares
  let totalBaseFare = 0;
  const enrichedPassengers = passengers.map((p) => {
    const seatDoc = seats.find((s) => s.seatNumber === p.seatNumber.trim().toUpperCase());
    const fare = seatDoc ? seatDoc.fare : trip.fares.seater;
    totalBaseFare += fare;

    return {
      seatNumber: p.seatNumber.trim().toUpperCase(),
      deck: seatDoc?.deck || 'lower',
      seatType: seatDoc?.seatType || 'seater',
      name: p.name.trim(),
      age: Number(p.age),
      gender: p.gender.toLowerCase(),
      fare,
    };
  });

  const gstAmount = Math.round(totalBaseFare * 0.05); // 5% GST
  const discountAmount = 0;
  const totalAmount = totalBaseFare + gstAmount - discountAmount;

  // 5. Create Booking Record
  const booking = await Booking.create({
    userId: req.user._id,
    tripId: trip._id,
    operatorId: trip.operatorId,
    busId: trip.busId,
    routeId: trip.routeId,
    passengers: enrichedPassengers,
    totalSeats: passengers.length,
    totalBaseFare,
    gstAmount,
    discountAmount,
    totalAmount,
    boardingPoint,
    droppingPoint,
    contactDetails,
    bookingStatus: 'confirmed',
    paymentStatus: 'paid', // Test mode auto-settled
    idempotencyKey,
  });

  // 6. Atomically Update Seat Inventory to Booked
  for (const p of enrichedPassengers) {
    await Seat.findOneAndUpdate(
      { tripId, seatNumber: p.seatNumber },
      {
        status: 'booked',
        bookingId: booking._id,
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
        passenger: { name: p.name, age: p.age, gender: p.gender },
      }
    );
  }

  // 7. Decrement Available Seats on Trip
  trip.availableSeats = Math.max(0, trip.availableSeats - passengers.length);
  await trip.save();

  // 8. Create Payment Record (Simulated or Razorpay Test Mode)
  const payment = await Payment.create({
    bookingId: booking._id,
    userId: req.user._id,
    amount: totalAmount,
    currency: 'INR',
    gateway: 'razorpay',
    razorpayOrderId: razorpayOrderId || `order_sim_${Date.now()}`,
    razorpayPaymentId: razorpayPaymentId || `pay_sim_${Date.now()}`,
    status: 'captured',
  });

  booking.paymentId = payment._id;
  await booking.save();

  // 9. Log Material Audit Action
  await logAuditAction({
    req,
    action: 'BOOKING_CONFIRM',
    entityType: 'Booking',
    entityId: booking._id,
    details: {
      pnr: booking.pnr,
      totalSeats: booking.totalSeats,
      seats: seatNumbers,
      amount: totalAmount,
    },
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate('tripId')
    .populate('busId')
    .populate('operatorId')
    .populate('routeId');

  sendSuccess(res, 201, 'Booking confirmed successfully!', {
    booking: populatedBooking,
    payment,
  });
});

/**
 * @desc    Get booking details by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingById = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('tripId')
    .populate('busId')
    .populate('operatorId')
    .populate('routeId')
    .populate('paymentId');

  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  // Passenger can only view their own booking; Admin/Operator can view all
  if (
    req.user.role === 'customer' &&
    booking.userId.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('You do not have access to view this booking.', 403));
  }

  sendSuccess(res, 200, 'Booking retrieved successfully.', { booking });
});

/**
 * @desc    Get booking by unique PNR
 * @route   GET /api/bookings/pnr/:pnr
 * @access  Public / Private
 */
const getBookingByPNR = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findOne({ pnr: req.params.pnr.trim().toUpperCase() })
    .populate('tripId')
    .populate('busId')
    .populate('operatorId')
    .populate('routeId')
    .populate('paymentId');

  if (!booking) {
    return next(new AppError(`No booking found with PNR ${req.params.pnr}.`, 404));
  }

  sendSuccess(res, 200, 'Booking details retrieved by PNR.', { booking });
});

/**
 * @desc    Get all bookings for logged-in customer
 * @route   GET /api/bookings/my-bookings
 * @access  Private (Customer)
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id })
    .populate('tripId')
    .populate('busId', 'name busNumber busType amenities')
    .populate('operatorId', 'name contactPhone rating')
    .populate('routeId', 'sourceCity destinationCity')
    .sort({ createdAt: -1 });

  sendSuccess(res, 200, 'User bookings retrieved successfully.', {
    count: bookings.length,
    bookings,
  });
});

/**
 * @desc    Get all bookings (Admin/Operator dashboard)
 * @route   GET /api/bookings
 * @access  Private (Admin or Operator)
 */
const getAllBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.user.role === 'operator') {
    query.operatorId = req.user.operatorId;
  } else if (req.query.operatorId) {
    query.operatorId = req.query.operatorId;
  }

  if (req.query.tripId) {
    query.tripId = req.query.tripId;
  }

  if (req.query.status) {
    query.bookingStatus = req.query.status;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { pnr: searchRegex },
      { 'contactDetails.email': searchRegex },
      { 'contactDetails.phone': searchRegex },
      { 'passengers.name': searchRegex },
    ];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('userId', 'name email phone')
      .populate('operatorId', 'name')
      .populate('busId', 'name busNumber')
      .populate('routeId', 'sourceCity destinationCity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Bookings directory retrieved successfully.', {
    bookings,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

module.exports = {
  createBooking,
  getBookingById,
  getBookingByPNR,
  getMyBookings,
  getAllBookings,
};
