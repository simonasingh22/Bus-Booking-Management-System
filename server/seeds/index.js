require('dotenv').config();

const mongoose = require('mongoose');
const {
  User,
  Operator,
  Bus,
  Route,
  Trip,
  Seat,
  Booking,
  Payment,
  AuditLog,
} = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/busbooking';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

function generateSeatTemplate(totalSeats = 40, layoutType = '2x2', busType = 'AC Seater') {
  if (!Number.isInteger(totalSeats) || totalSeats < 1) {
    throw new Error('totalSeats must be a positive integer');
  }
  if (layoutType !== '2x2') {
    throw new Error(`Unsupported seed seat layout: ${layoutType}`);
  }

  const seats = [];
  const isSleeper = busType.includes('Sleeper');
  const isHybrid = busType.includes('Hybrid');
  const rows = Math.ceil(totalSeats / 4);

  for (let row = 1; row <= rows && seats.length < totalSeats; row += 1) {
    for (let column = 1; column <= 4 && seats.length < totalSeats; column += 1) {
      const deck = isHybrid && row > Math.floor(rows / 2) ? 'upper' : 'lower';
      const seatType = isSleeper || (isHybrid && deck === 'upper') ? 'sleeper' : 'seater';
      seats.push({
        seatNumber: `${String.fromCharCode(64 + row)}${column}`,
        deck,
        seatType,
        row,
        column,
        isLadiesOnly: column === 1 && row <= 2,
        basePriceOffset: seatType === 'sleeper' ? 300 : 0,
      });
    }
  }

  if (seats.length !== totalSeats || new Set(seats.map((seat) => seat.seatNumber)).size !== totalSeats) {
    throw new Error(`Could not generate a unique ${totalSeats}-seat template`);
  }
  return seats;
}

async function findOrCreateUser(data) {
  let user = await User.findOne({ email: data.email });
  if (!user) {
    user = await User.create(data);
  }
  return user;
}

async function upsertDocument(Model, filter, data) {
  return Model.findOneAndUpdate(filter, { $setOnInsert: data }, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
}

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function seed() {
  const operators = [];
  const buses = [];
  const routes = [];

  operators.push(await upsertDocument(Operator, { licenseNumber: 'KA-COM-2022-09881' }, {
    name: 'Kalyan Intercity Travels',
    contactEmail: 'contact@kalyantravels.com',
    contactPhone: '9845012345',
    licenseNumber: 'KA-COM-2022-09881',
    address: { street: 'Kaladgi Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    rating: 4.8,
    totalRatings: 124,
    cancellationPolicy: { fullRefundHours: 24, partialRefundHours: 12, noRefundHours: 4, cancellationChargePercent: 10 },
  }));
  operators.push(await upsertDocument(Operator, { licenseNumber: 'MH-COM-2021-44512' }, {
    name: 'GreenLine Volvo Express',
    contactEmail: 'support@greenlinebus.com',
    contactPhone: '9820011223',
    licenseNumber: 'MH-COM-2021-44512',
    address: { street: 'Western Express Highway', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    rating: 4.6,
    totalRatings: 89,
    cancellationPolicy: { fullRefundHours: 24, partialRefundHours: 8, noRefundHours: 2, cancellationChargePercent: 15 },
  }));
  console.log(`Operators ready: ${operators.length}`);

  const users = [];
  users.push(await findOrCreateUser({
    name: 'System Administrator',
    email: 'admin@busbooking.com',
    password: 'Admin@123456',
    phone: '9900011122',
    role: 'admin',
  }));
  users.push(await findOrCreateUser({
    name: 'Kalyan Operator Manager',
    email: 'operator@travels.com',
    password: 'Operator@123',
    phone: '9845099887',
    role: 'operator',
    operatorId: operators[0]._id,
  }));
  users.push(await findOrCreateUser({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Customer@123',
    phone: '9876543210',
    role: 'customer',
    address: { city: 'Bengaluru', state: 'Karnataka' },
  }));
  console.log(`Users ready: ${users.length}`);

  const busData = [
    {
      busNumber: 'KA01AB1234',
      operatorId: operators[0]._id,
      name: 'Kalyan Diamond AC Multi-Axle',
      busType: 'AC Sleeper / Seater Hybrid',
      totalSeats: 36,
      layoutType: '2x2',
      deckType: 'double',
      seatTemplate: generateSeatTemplate(36, '2x2', 'AC Sleeper / Seater Hybrid'),
      amenities: ['WiFi', 'Charging Point', 'Water Bottle', 'Blanket', 'Reading Light', 'Emergency Exit'],
      status: 'active',
    },
    {
      busNumber: 'MH02CD5678',
      operatorId: operators[1]._id,
      name: 'GreenLine Cruiser Volvo B11R',
      busType: 'Volvo Multi-Axle',
      totalSeats: 40,
      layoutType: '2x2',
      deckType: 'single',
      seatTemplate: generateSeatTemplate(40, '2x2', 'Volvo Multi-Axle'),
      amenities: ['WiFi', 'Charging Point', 'Water Bottle', 'Emergency Exit', 'Live Tracking'],
      status: 'active',
    },
  ];
  for (const data of busData) buses.push(await upsertDocument(Bus, { busNumber: data.busNumber }, data));
  console.log(`Buses ready: ${buses.length}`);

  const routeData = [
    {
      sourceCity: 'Bengaluru', sourceState: 'Karnataka', destinationCity: 'Hyderabad', destinationState: 'Telangana',
      distanceKm: 570, estimatedDurationMinutes: 540,
      stops: [
        { stopName: 'Majestic Bus Stand', city: 'Bengaluru', landmark: 'Platform 3', stopType: 'boarding', order: 1 },
        { stopName: 'Hebbal Flyover', city: 'Bengaluru', landmark: 'Near Esteem Mall', stopType: 'boarding', order: 2, durationOffsetMinutes: 30 },
        { stopName: 'Anantapur Bypass', city: 'Anantapur', landmark: 'Toll Plaza', stopType: 'both', order: 3, durationOffsetMinutes: 240 },
        { stopName: 'Shamshabad Airport Road', city: 'Hyderabad', landmark: 'PVNR Expressway Entry', stopType: 'dropping', order: 4, durationOffsetMinutes: 500 },
        { stopName: 'Ameerpet Metro', city: 'Hyderabad', landmark: 'Opposite Big Bazaar', stopType: 'dropping', order: 5, durationOffsetMinutes: 540 },
      ],
    },
    {
      sourceCity: 'Mumbai', sourceState: 'Maharashtra', destinationCity: 'Pune', destinationState: 'Maharashtra',
      distanceKm: 150, estimatedDurationMinutes: 210,
      stops: [
        { stopName: 'Dadar TT Circle', city: 'Mumbai', landmark: 'Near Swami Narayan Temple', stopType: 'boarding', order: 1 },
        { stopName: 'Vashi Plaza', city: 'Navi Mumbai', landmark: 'Highway Bridge', stopType: 'boarding', order: 2, durationOffsetMinutes: 45 },
        { stopName: 'Wakad Bridge', city: 'Pune', landmark: 'Ginger Hotel Junction', stopType: 'dropping', order: 3, durationOffsetMinutes: 180 },
        { stopName: 'Swargate Bus Terminal', city: 'Pune', landmark: 'Main Gate', stopType: 'dropping', order: 4, durationOffsetMinutes: 210 },
      ],
    },
    {
      sourceCity: 'Bengaluru', sourceState: 'Karnataka', destinationCity: 'Chennai', destinationState: 'Tamil Nadu',
      distanceKm: 350, estimatedDurationMinutes: 360,
      stops: [
        { stopName: 'Madiwala', city: 'Bengaluru', landmark: 'Near Police Station', stopType: 'boarding', order: 1 },
        { stopName: 'Electronic City Toll', city: 'Bengaluru', landmark: 'Phase 1', stopType: 'boarding', order: 2, durationOffsetMinutes: 25 },
        { stopName: 'Hosur Bus Stand', city: 'Hosur', landmark: 'Ring Road', stopType: 'both', order: 3, durationOffsetMinutes: 60 },
        { stopName: 'Koyambedu CMBT', city: 'Chennai', landmark: 'Private Bus Terminal', stopType: 'dropping', order: 4, durationOffsetMinutes: 360 },
      ],
    },
  ];
  for (const data of routeData) {
    routes.push(await upsertDocument(Route, {
      sourceCity: data.sourceCity,
      destinationCity: data.destinationCity,
      isActive: true,
    }, data));
  }
  console.log(`Routes ready: ${routes.length}`);

  const tomorrow = dateOnly(addDays(new Date(), 1));
  const dayAfterTomorrow = dateOnly(addDays(new Date(), 2));
  const tripData = [
    {
      tripCode: `TRIP-${tomorrow.toISOString().slice(0, 10).replace(/-/g, '')}-BLR-HYD`,
      busId: buses[0]._id, operatorId: operators[0]._id, routeId: routes[0]._id,
      departureDate: tomorrow, departureTime: '21:30', arrivalDate: addDays(tomorrow, 1), arrivalTime: '06:30',
      fares: { seater: 799, sleeper: 1199 },
      boardingPoints: [{ pointName: 'Majestic Bus Stand', landmark: 'Platform 3', time: '21:30' }, { pointName: 'Hebbal Flyover', landmark: 'Near Esteem Mall', time: '22:00' }],
      droppingPoints: [{ pointName: 'Shamshabad Airport Road', landmark: 'PVNR Entry', time: '05:45' }, { pointName: 'Ameerpet Metro', landmark: 'Opposite Big Bazaar', time: '06:30' }],
      totalSeats: buses[0].totalSeats, availableSeats: buses[0].totalSeats, status: 'scheduled',
    },
    {
      tripCode: `TRIP-${tomorrow.toISOString().slice(0, 10).replace(/-/g, '')}-MUM-PUN`,
      busId: buses[1]._id, operatorId: operators[1]._id, routeId: routes[1]._id,
      departureDate: tomorrow, departureTime: '07:00', arrivalDate: tomorrow, arrivalTime: '10:30',
      fares: { seater: 450, sleeper: 0 },
      boardingPoints: [{ pointName: 'Dadar TT Circle', landmark: 'Near Swami Narayan Temple', time: '07:00' }, { pointName: 'Vashi Plaza', landmark: 'Highway Bridge', time: '07:45' }],
      droppingPoints: [{ pointName: 'Wakad Bridge', landmark: 'Ginger Hotel Junction', time: '10:00' }, { pointName: 'Swargate Bus Terminal', landmark: 'Main Gate', time: '10:30' }],
      totalSeats: buses[1].totalSeats, availableSeats: buses[1].totalSeats, status: 'scheduled',
    },
    {
      tripCode: `TRIP-${dayAfterTomorrow.toISOString().slice(0, 10).replace(/-/g, '')}-BLR-CHN`,
      busId: buses[0]._id, operatorId: operators[0]._id, routeId: routes[2]._id,
      departureDate: dayAfterTomorrow, departureTime: '14:00', arrivalDate: dayAfterTomorrow, arrivalTime: '20:00',
      fares: { seater: 599, sleeper: 899 },
      boardingPoints: [{ pointName: 'Madiwala', landmark: 'Near Police Station', time: '14:00' }, { pointName: 'Electronic City Toll', landmark: 'Phase 1', time: '14:25' }],
      droppingPoints: [{ pointName: 'Koyambedu CMBT', landmark: 'Private Bus Terminal', time: '20:00' }],
      totalSeats: buses[0].totalSeats, availableSeats: buses[0].totalSeats, status: 'scheduled',
    },
  ];
  const trips = [];
  for (const data of tripData) trips.push(await upsertDocument(Trip, { tripCode: data.tripCode }, data));
  console.log(`Trips ready: ${trips.length}`);

  for (const trip of trips) {
    const bus = buses.find((item) => item._id.equals(trip.busId));
    for (const template of bus.seatTemplate) {
      await upsertDocument(Seat, { tripId: trip._id, seatNumber: template.seatNumber }, {
        tripId: trip._id, busId: bus._id, seatNumber: template.seatNumber, deck: template.deck,
        seatType: template.seatType, row: template.row, column: template.column,
        fare: template.seatType === 'sleeper' ? trip.fares.sleeper : trip.fares.seater,
        status: 'available', isLadiesOnly: template.isLadiesOnly,
      });
    }
  }
  console.log('Seat inventories ready without duplicates');

  const demoTrip = trips[0];
  const demoSeat = await Seat.findOne({ tripId: demoTrip._id, seatNumber: 'A1' });
  if (!demoSeat) throw new Error('Demo seat A1 was not generated');
  let demoBooking = await Booking.findOne({ idempotencyKey: 'seed-demo-booking-v1' });
  if (!demoBooking) {
    demoBooking = await Booking.create({
      userId: users[2]._id, tripId: demoTrip._id, operatorId: operators[0]._id, busId: buses[0]._id, routeId: routes[0]._id,
      passengers: [{ seatNumber: 'A1', deck: demoSeat.deck, seatType: demoSeat.seatType, name: 'John Doe', age: 28, gender: 'male', fare: 799 }],
      totalSeats: 1, totalBaseFare: 799, gstAmount: 40, discountAmount: 0, totalAmount: 839,
      boardingPoint: demoTrip.boardingPoints[0], droppingPoint: demoTrip.droppingPoints[1],
      contactDetails: { email: users[2].email, phone: users[2].phone },
      bookingStatus: 'confirmed', paymentStatus: 'paid', idempotencyKey: 'seed-demo-booking-v1',
    });
  }

  if (demoSeat.status !== 'booked' || !demoSeat.bookingId || !demoSeat.bookingId.equals(demoBooking._id)) {
    demoSeat.status = 'booked';
    demoSeat.bookingId = demoBooking._id;
    demoSeat.passenger = { name: 'John Doe', age: 28, gender: 'male' };
    await demoSeat.save();
  }
  let payment = await Payment.findOne({ bookingId: demoBooking._id });
  if (!payment) {
    payment = await Payment.create({
      bookingId: demoBooking._id, userId: users[2]._id, amount: 839,
      gateway: 'test_simulation', status: 'captured',
    });
  }
  if (!demoBooking.paymentId || !demoBooking.paymentId.equals(payment._id)) {
    demoBooking.paymentId = payment._id;
    await demoBooking.save();
  }
  await AuditLog.findOneAndUpdate(
    { entityType: 'Booking', entityId: demoBooking._id.toString(), action: 'BOOKING_CONFIRM' },
    { $setOnInsert: { userId: users[2]._id, userName: users[2].name, userRole: users[2].role, details: { pnr: demoBooking.pnr, seats: ['A1'], amount: 839 } } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  for (const trip of trips) {
    const availableSeats = await Seat.countDocuments({ tripId: trip._id, status: 'available' });
    if (trip.availableSeats !== availableSeats) {
      trip.availableSeats = availableSeats;
      await trip.save();
    }
  }

  const counts = {
    users: await User.countDocuments(),
    operators: await Operator.countDocuments(),
    buses: await Bus.countDocuments(),
    routes: await Route.countDocuments(),
    trips: await Trip.countDocuments(),
    seats: await Seat.countDocuments(),
    bookings: await Booking.countDocuments(),
    payments: await Payment.countDocuments(),
  };
  console.log('Seed counts:', counts);
  console.log('Demo credentials:');
  console.log('  Admin:    admin@busbooking.com | Admin@123456');
  console.log('  Operator: operator@travels.com  | Operator@123');
  console.log('  Customer: john@example.com      | Customer@123');
  console.log(`Demo booking PNR: ${demoBooking.pnr}`);
  console.log(`Bengaluru-Hyderabad trip date: ${demoTrip.departureDate.toISOString().slice(0, 10)}`);
}

async function main() {
  try {
    await connectDB();
    await seed();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected seeding failure:', error);
    process.exitCode = 1;
  });
}

module.exports = { connectDB, generateSeatTemplate, seed };
