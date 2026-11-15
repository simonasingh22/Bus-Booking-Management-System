const Trip = require('../trips/Trip.model');
const Booking = require('../bookings/Booking.model');
const Bus = require('../buses/Bus.model');
const Operator = require('../operators/Operator.model');
const Route = require('../routes/Route.model');
const Seat = require('../seats/Seat.model');
const Payment = require('../payments/Payment.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');

const settledBookingFilter = {
  bookingStatus: 'confirmed',
  paymentStatus: 'paid',
};

const isSettledBooking = (booking) =>
  booking?.bookingStatus === 'confirmed' && booking?.paymentStatus === 'paid';

const calculateFinancials = (bookings, payments = []) => {
  const paymentByBookingId = new Map(
    payments.map((payment) => [payment.bookingId.toString(), payment])
  );
  const grossCustomerSales = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
  const baseFareRevenue = bookings.reduce((sum, booking) => sum + (booking.totalBaseFare || 0), 0);
  const gstCollected = bookings.reduce((sum, booking) => sum + (booking.gstAmount || 0), 0);
  const processedRefunds = payments.reduce(
    (sum, payment) => sum + (payment.refund?.status === 'processed' ? payment.refund.amount || 0 : 0),
    0
  );

  return {
    grossCustomerSales,
    baseFareRevenue,
    gstCollected,
    processedRefunds,
    netSettledReceipts: grossCustomerSales - processedRefunds,
    paymentByBookingId,
  };
};

const getSettledBookings = async (filter = {}) => {
  const payments = await Payment.find({ status: 'captured' });
  const paymentBookingIds = payments.map((payment) => payment.bookingId);
  const bookings = await Booking.find({
    ...settledBookingFilter,
    ...filter,
    _id: { $in: paymentBookingIds },
  });
  const settledBookings = bookings.filter(isSettledBooking);
  const bookingIds = new Set(settledBookings.map((booking) => booking._id.toString()));
  return {
    bookings: settledBookings,
    payments: await Payment.find({ bookingId: { $in: [...bookingIds] } }),
  };
};

const getProcessedRefunds = async (filter = {}) => {
  const refundPayments = await Payment.find({
    'refund.status': 'processed',
  });
  if (!Object.keys(filter).length) return refundPayments;

  const bookingIds = refundPayments.map((payment) => payment.bookingId);
  const bookings = await Booking.find({ _id: { $in: bookingIds }, ...filter }).select('_id');
  const allowedBookingIds = new Set(bookings.map((booking) => booking._id.toString()));
  return refundPayments.filter((payment) => allowedBookingIds.has(payment.bookingId.toString()));
};

/**
 * @desc    Get KPI metrics and performance stats (Admin/Operator)
 * @route   GET /api/reports/dashboard-stats
 * @access  Private (Admin or Operator)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const query = {};
  const busQuery = { status: 'active' };

  if (req.user.role === 'operator') {
    query.operatorId = req.user.operatorId;
    busQuery.operatorId = req.user.operatorId;
  }

  // 1. Confirmed Bookings & Revenue
  const { bookings: confirmedBookings, payments } = await getSettledBookings(
    req.user.role === 'operator' ? { operatorId: req.user.operatorId } : {}
  );
  const financials = calculateFinancials(confirmedBookings, payments);
  const processedRefunds = await getProcessedRefunds(
    req.user.role === 'operator' ? { operatorId: req.user.operatorId } : {}
  );
  financials.processedRefunds = processedRefunds.reduce(
    (sum, payment) => sum + (payment.refund.amount || 0),
    0
  );
  financials.netSettledReceipts = financials.grossCustomerSales - financials.processedRefunds;
  const totalBookings = confirmedBookings.length;

  // 2. Active Trips & Occupancy
  const activeTrips = await Trip.find({ ...query, status: { $in: ['scheduled', 'boarding'] } })
    .populate('routeId', 'sourceCity destinationCity')
    .populate('busId', 'name busNumber');

  const totalTripsCount = activeTrips.length;
  let aggregateTotalSeats = 0;
  let aggregateBookedSeats = 0;
  const activeTripIds = new Set(activeTrips.map((trip) => trip._id.toString()));
  const settledPassengersByTrip = new Map();
  confirmedBookings.forEach((booking) => {
    if (activeTripIds.has(booking.tripId.toString())) {
      const current = settledPassengersByTrip.get(booking.tripId.toString()) || 0;
      settledPassengersByTrip.set(booking.tripId.toString(), current + booking.passengers.length);
    }
  });

  activeTrips.forEach((t) => {
    aggregateTotalSeats += t.totalSeats || 0;
    aggregateBookedSeats += settledPassengersByTrip.get(t._id.toString()) || 0;
  });

  const averageOccupancyPercent =
    aggregateTotalSeats > 0
      ? Math.round((aggregateBookedSeats / aggregateTotalSeats) * 100)
      : 0;

  // 3. Active Fleet Count
  const totalBuses = await Bus.countDocuments(busQuery);

  // 4. Recent Bookings
  const recentBookings = await Booking.find({
    _id: { $in: confirmedBookings.map((booking) => booking._id) },
  })
    .populate('tripId', 'departureDate departureTime')
    .populate('routeId', 'sourceCity destinationCity')
    .populate('operatorId', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  sendSuccess(res, 200, 'Dashboard statistics retrieved.', {
    stats: {
      totalRevenue: financials.grossCustomerSales,
      grossCustomerSales: financials.grossCustomerSales,
      baseFareRevenue: financials.baseFareRevenue,
      gstCollected: financials.gstCollected,
      processedRefunds: financials.processedRefunds,
      netSettledReceipts: financials.netSettledReceipts,
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

  // Only paid, captured bookings are financially settled and eligible for the manifest.
  const { bookings: confirmedBookings, payments } = await getSettledBookings({ tripId });
  confirmedBookings.sort((a, b) => a.createdAt - b.createdAt);

  // Reconcile passenger rows
  const manifestPassengers = [];
  const financials = calculateFinancials(confirmedBookings, payments);

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
      baseFareCollected: financials.baseFareRevenue,
      gstCollected: financials.gstCollected,
      totalCustomerAmountPaid: financials.grossCustomerSales,
      // Deprecated compatibility alias; this now has an explicit base-fare meaning.
      totalFareCollected: financials.baseFareRevenue,
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
      const { bookings: confirmedBookings, payments } = await getSettledBookings({ tripId: trip._id });

      let totalPassengers = 0;
      confirmedBookings.forEach((b) => {
        totalPassengers += b.passengers.length;
      });
      const financials = calculateFinancials(confirmedBookings, payments);

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
        revenue: financials.grossCustomerSales,
        grossCustomerSales: financials.grossCustomerSales,
        baseFareRevenue: financials.baseFareRevenue,
        gstCollected: financials.gstCollected,
        processedRefunds: financials.processedRefunds,
        netSettledReceipts: financials.netSettledReceipts,
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
  calculateFinancials,
  getSettledBookings,
  isSettledBooking,
};
