const Trip = require('../trips/Trip.model');
const Booking = require('../bookings/Booking.model');
const Bus = require('../buses/Bus.model');
const Operator = require('../operators/Operator.model');
const Route = require('../routes/Route.model');
const Seat = require('../seats/Seat.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');

/**
 * @desc    Get KPI metrics and performance stats (Admin/Operator)
 * @route   GET /api/reports/dashboard-stats
 * @access  Private (Admin or Operator)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const query = {};
  const bookingQuery = { bookingStatus: 'confirmed' };
  const busQuery = { status: 'active' };

  if (req.user.role === 'operator') {
    query.operatorId = req.user.operatorId;
    bookingQuery.operatorId = req.user.operatorId;
    busQuery.operatorId = req.user.operatorId;
  }

  // 1. Confirmed Bookings & Revenue
  const confirmedBookings = await Booking.find(bookingQuery);
  const totalBookings = confirmedBookings.length;
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // 2. Active Trips & Occupancy
  const activeTrips = await Trip.find({ ...query, status: { $in: ['scheduled', 'boarding'] } })
    .populate('routeId', 'sourceCity destinationCity')
    .populate('busId', 'name busNumber');

  const totalTripsCount = activeTrips.length;
  let aggregateTotalSeats = 0;
  let aggregateBookedSeats = 0;

  activeTrips.forEach((t) => {
    aggregateTotalSeats += t.totalSeats || 0;
    aggregateBookedSeats += Math.max(0, (t.totalSeats || 0) - (t.availableSeats || 0));
  });

  const averageOccupancyPercent =
    aggregateTotalSeats > 0
      ? Math.round((aggregateBookedSeats / aggregateTotalSeats) * 100)
      : 0;

  // 3. Active Fleet Count
  const totalBuses = await Bus.countDocuments(busQuery);

  // 4. Recent Bookings
  const recentBookings = await Booking.find(bookingQuery)
    .populate('tripId', 'departureDate departureTime')
    .populate('routeId', 'sourceCity destinationCity')
    .populate('operatorId', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  sendSuccess(res, 200, 'Dashboard statistics retrieved.', {
    stats: {
      totalRevenue,
      totalBookings,
      activeTrips: totalTripsCount,
      activeBuses: totalBuses,
      averageOccupancyPercent,
      aggregateTotalSeats,
      aggregateBookedSeats,
    },
    recentBookings,
  });
});

/**
 * @desc    Generate official Passenger Manifest for a trip (Reconciled with confirmed bookings)
 * @route   GET /api/reports/trip-manifest/:tripId
 * @access  Private (Admin or Operator)
 */
const getTripManifest = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId)
    .populate('busId')
    .populate('operatorId')
    .populate('routeId');

  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  // Operator isolation
  if (
    req.user.role === 'operator' &&
    req.user.operatorId?.toString() !== trip.operatorId?._id.toString()
  ) {
    return next(new AppError('You do not have access to view this manifest.', 403));
  }

  // Find all confirmed bookings for this trip
  const confirmedBookings = await Booking.find({
    tripId,
    bookingStatus: 'confirmed',
  }).sort({ createdAt: 1 });

  // Reconcile passenger rows
  const manifestPassengers = [];
  let totalRevenue = 0;

  confirmedBookings.forEach((b) => {
    b.passengers.forEach((p) => {
      manifestPassengers.push({
        seatNumber: p.seatNumber,
        deck: p.deck || 'lower',
        seatType: p.seatType || 'seater',
        passengerName: p.name,
        age: p.age,
        gender: p.gender,
        contactEmail: b.contactDetails?.email,
        contactPhone: b.contactDetails?.phone,
        boardingPoint: b.boardingPoint?.pointName,
        boardingTime: b.boardingPoint?.time,
        droppingPoint: b.droppingPoint?.pointName,
        pnr: b.pnr,
        fare: p.fare,
      });
      totalRevenue += p.fare;
    });
  });

  // Sort manifest by seat number
  manifestPassengers.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));

  const bookedSeatsCount = manifestPassengers.length;
  const vacantSeatsCount = Math.max(0, trip.totalSeats - bookedSeatsCount);
  const occupancyPercentage =
    trip.totalSeats > 0 ? Math.round((bookedSeatsCount / trip.totalSeats) * 100) : 0;

  sendSuccess(res, 200, 'Trip passenger manifest generated.', {
    tripDetails: {
      tripId: trip._id,
      tripCode: trip.tripCode,
      operatorName: trip.operatorId?.name,
      busNumber: trip.busId?.busNumber,
      busName: trip.busId?.name,
      busType: trip.busId?.busType,
      route: `${trip.routeId?.sourceCity} → ${trip.routeId?.destinationCity}`,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
    },
    reconciliation: {
      totalCapacity: trip.totalSeats,
      bookedSeatsCount,
      vacantSeatsCount,
      occupancyPercentage,
      totalFareCollected: totalRevenue,
    },
    manifest: manifestPassengers,
  });
});

/**
 * @desc    Get seat occupancy report across all scheduled trips
 * @route   GET /api/reports/occupancy-summary
 * @access  Private (Admin or Operator)
 */
const getOccupancySummary = asyncHandler(async (req, res) => {
  const query = { status: { $in: ['scheduled', 'boarding', 'in-transit', 'completed'] } };

  if (req.user.role === 'operator') {
    query.operatorId = req.user.operatorId;
  } else if (req.query.operatorId) {
    query.operatorId = req.query.operatorId;
  }

  const trips = await Trip.find(query)
    .populate('busId', 'name busNumber busType totalSeats')
    .populate('operatorId', 'name')
    .populate('routeId', 'sourceCity destinationCity')
    .sort({ departureDate: -1, departureTime: 1 })
    .limit(50);

  const reportItems = await Promise.all(
    trips.map(async (trip) => {
      const bookingsCount = await Booking.countDocuments({
        tripId: trip._id,
        bookingStatus: 'confirmed',
      });

      const confirmedBookings = await Booking.find({
        tripId: trip._id,
        bookingStatus: 'confirmed',
      });

      let totalPassengers = 0;
      let revenue = 0;
      confirmedBookings.forEach((b) => {
        totalPassengers += b.passengers.length;
        revenue += b.totalAmount;
      });

      const totalSeats = trip.busId?.totalSeats || trip.totalSeats;
      const occupancyRate =
        totalSeats > 0 ? Math.round((totalPassengers / totalSeats) * 100) : 0;

      return {
        tripId: trip._id,
        tripCode: trip.tripCode,
        operatorName: trip.operatorId?.name,
        route: `${trip.routeId?.sourceCity} → ${trip.routeId?.destinationCity}`,
        travelDate: trip.departureDate,
        departureTime: trip.departureTime,
        busNumber: trip.busId?.busNumber,
        status: trip.status,
        totalSeats,
        bookedSeats: totalPassengers,
        availableSeats: Math.max(0, totalSeats - totalPassengers),
        occupancyRate,
        revenue,
      };
    })
  );

  sendSuccess(res, 200, 'Occupancy reconciliation summary generated.', {
    count: reportItems.length,
    reports: reportItems,
  });
});

module.exports = {
  getDashboardStats,
  getTripManifest,
  getOccupancySummary,
};
