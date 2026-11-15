const User = require('../modules/users/User.model');
const Operator = require('../modules/operators/Operator.model');
const Bus = require('../modules/buses/Bus.model');
const Route = require('../modules/routes/Route.model');
const Trip = require('../modules/trips/Trip.model');
const Seat = require('../modules/seats/Seat.model');
const Booking = require('../modules/bookings/Booking.model');
const Payment = require('../modules/payments/Payment.model');
const Cancellation = require('../modules/cancellations/Cancellation.model');
const AuditLog = require('../modules/auditLogs/AuditLog.model');

module.exports = {
  User,
  Operator,
  Bus,
  Route,
  Trip,
  Seat,
  Booking,
  Payment,
  Cancellation,
  AuditLog,
};
