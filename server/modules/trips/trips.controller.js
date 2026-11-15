const Trip = require('./Trip.model');
const Route = require('../routes/Route.model');
const Bus = require('../buses/Bus.model');
const Operator = require('../operators/Operator.model');
const Seat = require('../seats/Seat.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Search and filter trips (Public Passenger Journey)
 * @route   GET /api/trips
 * @access  Public
 */
const searchTrips = asyncHandler(async (req, res) => {
  const {
    sourceCity,
    destinationCity,
    departureDate,
    busType,
    operatorId,
    minFare,
    maxFare,
    sortBy,
    page = 1,
    limit = 20,
  } = req.query;

  const tripQuery = {
    status: { $in: ['scheduled', 'boarding'] },
  };

  // 1. Filter by Route (source & destination)
  if (sourceCity || destinationCity) {
    const routeQuery = { isActive: true };
    if (sourceCity) {
      routeQuery.sourceCity = new RegExp(`^${sourceCity.trim()}$`, 'i');
    }
    if (destinationCity) {
      routeQuery.destinationCity = new RegExp(`^${destinationCity.trim()}$`, 'i');
    }

    const matchingRoutes = await Route.find(routeQuery).select('_id');
    const routeIds = matchingRoutes.map((r) => r._id);
    tripQuery.routeId = { $in: routeIds };
  }

  // 2. Filter by Departure Date
  if (departureDate) {
    const startOfDay = new Date(departureDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(departureDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    tripQuery.departureDate = { $gte: startOfDay, $lte: endOfDay };
  }

  // 3. Filter by Operator
  if (operatorId) {
    tripQuery.operatorId = operatorId;
  }

  // 4. Filter by Bus Type
  if (busType) {
    const matchingBuses = await Bus.find({ busType, status: 'active' }).select('_id');
    const busIds = matchingBuses.map((b) => b._id);
    tripQuery.busId = { $in: busIds };
  }

  // 5. Filter by Fares
  if (minFare || maxFare) {
    tripQuery['fares.seater'] = {};
    if (minFare) tripQuery['fares.seater'].$gte = Number(minFare);
    if (maxFare) tripQuery['fares.seater'].$lte = Number(maxFare);
  }

  // Role scoping: If operator is requesting their trips list
  if (req.user && req.user.role === 'operator' && !sourceCity && !destinationCity) {
    tripQuery.operatorId = req.user.operatorId;
    delete tripQuery.status; // Operators can see completed/cancelled trips
  }

  // Sort Options
  let sortOption = { departureDate: 1, departureTime: 1 };
  if (sortBy === 'price_asc') {
    sortOption = { 'fares.seater': 1 };
  } else if (sortBy === 'price_desc') {
    sortOption = { 'fares.seater': -1 };
  } else if (sortBy === 'departure_desc') {
    sortOption = { departureTime: -1 };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [trips, total] = await Promise.all([
    Trip.find(tripQuery)
      .populate('routeId', 'sourceCity sourceState destinationCity destinationState estimatedDurationMinutes distanceKm')
      .populate('busId', 'name busNumber busType amenities totalSeats layoutType deckType')
      .populate('operatorId', 'name rating totalRatings logo cancellationPolicy')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Trip.countDocuments(tripQuery),
  ]);

  sendSuccess(res, 200, 'Trips retrieved successfully.', {
    trips,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

/**
 * @desc    Get trip details by ID
 * @route   GET /api/trips/:id
 * @access  Public
 */
const getTripById = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id)
    .populate('routeId')
    .populate('busId')
    .populate('operatorId');

  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  sendSuccess(res, 200, 'Trip details retrieved.', { trip });
});

/**
 * @desc    Schedule a new trip and instantiate its seat inventory
 * @route   POST /api/trips
 * @access  Private (Admin or Operator)
 */
const createTrip = asyncHandler(async (req, res, next) => {
  let {
    busId,
    routeId,
    operatorId,
    departureDate,
    departureTime,
    arrivalDate,
    arrivalTime,
    fares,
    boardingPoints,
    droppingPoints,
  } = req.body;

  if (!busId || !routeId || !departureDate || !departureTime || !arrivalDate || !arrivalTime || !fares) {
    return next(
      new AppError(
        'Please provide busId, routeId, departureDate, departureTime, arrivalDate, arrivalTime, and fares.',
        400
      )
    );
  }

  // Operator isolation
  if (req.user.role === 'operator') {
    if (!req.user.operatorId) {
      return next(new AppError('Your account is not linked to an active operator.', 400));
    }
    operatorId = req.user.operatorId;
  } else if (!operatorId) {
    return next(new AppError('Please specify operatorId.', 400));
  }

  // Verify bus exists and belongs to operator
  const bus = await Bus.findOne({ _id: busId, operatorId, status: 'active' });
  if (!bus) {
    return next(new AppError('Selected bus is invalid, inactive, or does not belong to this operator.', 400));
  }

  // Verify route exists
  const route = await Route.findOne({ _id: routeId, isActive: true });
  if (!route) {
    return next(new AppError('Selected route does not exist or is inactive.', 400));
  }

  // Derive boarding & dropping points from route stops if not provided
  if (!boardingPoints || boardingPoints.length === 0) {
    boardingPoints = route.stops
      .filter((s) => s.stopType === 'boarding' || s.stopType === 'both')
      .map((s) => ({
        pointName: s.stopName,
        landmark: s.landmark || '',
        time: departureTime,
      }));
  }

  if (!droppingPoints || droppingPoints.length === 0) {
    droppingPoints = route.stops
      .filter((s) => s.stopType === 'dropping' || s.stopType === 'both')
      .map((s) => ({
        pointName: s.stopName,
        landmark: s.landmark || '',
        time: arrivalTime,
      }));
  }

  // Create Trip Document
  const trip = await Trip.create({
    busId: bus._id,
    operatorId,
    routeId: route._id,
    departureDate: new Date(departureDate),
    departureTime,
    arrivalDate: new Date(arrivalDate),
    arrivalTime,
    fares: {
      seater: Number(fares.seater),
      sleeper: Number(fares.sleeper || 0),
    },
    boardingPoints,
    droppingPoints,
    totalSeats: bus.totalSeats,
    availableSeats: bus.totalSeats,
    status: 'scheduled',
  });

  // ─── INSTANTIATE SEAT INVENTORY FOR THIS TRIP ───
  // Guarantees immediate seat availability tracking and unique compound index integrity
  const seatDocs = bus.seatTemplate.map((tmpl) => {
    const isSleeper = tmpl.seatType === 'sleeper';
    const baseFare = isSleeper ? Number(fares.sleeper || fares.seater) : Number(fares.seater);
    const finalFare = baseFare + (tmpl.basePriceOffset || 0);

    return {
      tripId: trip._id,
      busId: bus._id,
      seatNumber: tmpl.seatNumber,
      deck: tmpl.deck || 'lower',
      seatType: tmpl.seatType || 'seater',
      row: tmpl.row,
      column: tmpl.column,
      fare: finalFare,
      status: 'available',
      isLadiesOnly: tmpl.isLadiesOnly || false,
    };
  });

  await Seat.insertMany(seatDocs);

  await logAuditAction({
    req,
    action: 'TRIP_CREATE',
    entityType: 'Trip',
    entityId: trip._id,
    details: {
      tripCode: trip.tripCode,
      seatsInitialized: seatDocs.length,
      route: `${route.sourceCity} -> ${route.destinationCity}`,
    },
  });

  sendSuccess(res, 201, 'Trip scheduled and seat inventory initialized successfully.', { trip });
});

/**
 * @desc    Update trip status (scheduled -> boarding -> in-transit -> completed / cancelled)
 * @route   PATCH /api/trips/:id/status
 * @access  Private (Admin or Operator)
 */
const updateTripStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['scheduled', 'boarding', 'in-transit', 'completed', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
  }

  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  if (
    req.user.role === 'operator' &&
    (!req.user.operatorId || req.user.operatorId.toString() !== trip.operatorId.toString())
  ) {
    return next(new AppError('You do not have permission to manage this trip.', 403));
  }

  trip.status = status;
  await trip.save();

  await logAuditAction({
    req,
    action: status === 'cancelled' ? 'TRIP_CANCEL' : 'TRIP_UPDATE',
    entityType: 'Trip',
    entityId: trip._id,
    details: { status },
  });

  sendSuccess(res, 200, `Trip status updated to ${status}.`, { trip });
});

/**
 * @desc    Cancel trip
 * @route   DELETE /api/trips/:id
 * @access  Private (Admin or Operator)
 */
const cancelTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  if (
    req.user.role === 'operator' &&
    (!req.user.operatorId || req.user.operatorId.toString() !== trip.operatorId.toString())
  ) {
    return next(new AppError('You do not have permission to cancel this trip.', 403));
  }

  trip.status = 'cancelled';
  await trip.save();

  // Release any temporary locked seats
  await Seat.updateMany(
    { tripId: trip._id, status: 'locked' },
    { status: 'available', lockedBy: null, lockExpiresAt: null }
  );

  await logAuditAction({
    req,
    action: 'TRIP_CANCEL',
    entityType: 'Trip',
    entityId: trip._id,
    details: { reason: req.body.reason || 'Operator cancelled trip' },
  });

  sendSuccess(res, 200, 'Trip cancelled successfully.', { trip });
});

module.exports = {
  searchTrips,
  getTripById,
  createTrip,
  updateTripStatus,
  cancelTrip,
};
