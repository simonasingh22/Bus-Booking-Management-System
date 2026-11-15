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
  Cancellation,
  AuditLog,
} = require('../models');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/busbooking';
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB for seeding');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const generateSeatTemplate = (totalSeats = 40, layoutType = '2x2', busType = 'AC Seater') => {
  const seats = [];
  const isSleeper = busType.includes('Sleeper');
  const isHybrid = busType.includes('Hybrid');

  let seatIndex = 1;
  const rows = Math.ceil(totalSeats / 4);

  for (let r = 1; r <= rows && seats.length < totalSeats; r++) {
    for (let c = 1; c <= 4 && seats.length < totalSeats; c++) {
      const seatNum = `${String.fromCharCode(64 + r)}${c}`;
      const deck = isHybrid && r > Math.floor(rows / 2) ? 'upper' : 'lower';
      const type = isSleeper || (isHybrid && deck === 'upper') ? 'sleeper' : 'seater';
      const isLadies = c === 1 && r <= 2; // First 2 window seats reserved for ladies

      seats.push({
        seatNumber: seatNum,
        deck,
        seatType: type,
        row: r,
        column: c,
        isLadiesOnly: isLadies,
        basePriceOffset: type === 'sleeper' ? 300 : 0,
      });
      seatIndex++;
    }
  }
  return seats;
};

const seed = async () => {
  await connectDB();

  console.log('🧹 Purging existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Operator.deleteMany({}),
    Bus.deleteMany({}),
    Route.deleteMany({}),
    Trip.deleteMany({}),
    Seat.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Cancellation.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  console.log('🏢 Seeding Operators...');
  const operators = await Operator.insertMany([
    {
      name: 'Kalyan Intercity Travels',
      contactEmail: 'contact@kalyantravels.com',
      contactPhone: '9845012345',
      licenseNumber: 'KA-COM-2022-09881',
      address: { street: 'Kaladgi Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      rating: 4.8,
      totalRatings: 124,
      cancellationPolicy: {
        fullRefundHours: 24,
        partialRefundHours: 12,
        noRefundHours: 4,
        cancellationChargePercent: 10,
      },
    },
    {
      name: 'GreenLine Volvo Express',
      contactEmail: 'support@greenlinebus.com',
      contactPhone: '9820011223',
      licenseNumber: 'MH-COM-2021-44512',
      address: { street: 'Western Express Highway', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      rating: 4.6,
      totalRatings: 89,
      cancellationPolicy: {
        fullRefundHours: 24,
        partialRefundHours: 8,
        noRefundHours: 2,
        cancellationChargePercent: 15,
      },
    },
  ]);

  console.log('👥 Seeding Users...');
  const users = await User.create([
    {
      name: 'System Administrator',
      email: 'admin@busbooking.com',
      password: 'Admin@123456',
      phone: '9900011122',
      role: 'admin',
    },
    {
      name: 'Kalyan Operator Manager',
      email: 'operator@travels.com',
      password: 'Operator@123',
      phone: '9845099887',
      role: 'operator',
      operatorId: operators[0]._id,
    },
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Customer@123',
      phone: '9876543210',
      role: 'customer',
      address: { city: 'Bengaluru', state: 'Karnataka' },
    },
  ]);

  console.log('🚌 Seeding Buses...');
  const bus1Seats = generateSeatTemplate(36, '2x2', 'AC Sleeper / Seater Hybrid');
  const bus2Seats = generateSeatTemplate(40, '2x2', 'Volvo Multi-Axle');

  const buses = await Bus.insertMany([
    {
      busNumber: 'KA01AB1234',
      operatorId: operators[0]._id,
      name: 'Kalyan Diamond AC Multi-Axle',
      busType: 'AC Sleeper / Seater Hybrid',
      totalSeats: 36,
      layoutType: '2x2',
      deckType: 'double',
      seatTemplate: bus1Seats,
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
      seatTemplate: bus2Seats,
      amenities: ['WiFi', 'Charging Point', 'Water Bottle', 'Emergency Exit', 'Live Tracking'],
      status: 'active',
    },
  ]);

  console.log('🛣️ Seeding Routes...');
  const routes = await Route.insertMany([
    {
      sourceCity: 'Bengaluru',
      sourceState: 'Karnataka',
      destinationCity: 'Hyderabad',
      destinationState: 'Telangana',
      distanceKm: 570,
      estimatedDurationMinutes: 540, // 9 hours
      stops: [
        { stopName: 'Majestic Bus Stand', city: 'Bengaluru', landmark: 'Platform 3', stopType: 'boarding', order: 1 },
        { stopName: 'Hebbal Flyover', city: 'Bengaluru', landmark: 'Near Esteem Mall', stopType: 'boarding', order: 2, durationOffsetMinutes: 30 },
        { stopName: 'Anantapur Bypass', city: 'Anantapur', landmark: 'Toll Plaza', stopType: 'both', order: 3, durationOffsetMinutes: 240 },
        { stopName: 'Shamshabad Airport Road', city: 'Hyderabad', landmark: 'PVNR Expressway Entry', stopType: 'dropping', order: 4, durationOffsetMinutes: 500 },
        { stopName: 'Ameerpet Metro', city: 'Hyderabad', landmark: 'Opposite Big Bazaar', stopType: 'dropping', order: 5, durationOffsetMinutes: 540 },
      ],
    },
    {
      sourceCity: 'Mumbai',
      sourceState: 'Maharashtra',
      destinationCity: 'Pune',
      destinationState: 'Maharashtra',
      distanceKm: 150,
      estimatedDurationMinutes: 210, // 3.5 hours
      stops: [
        { stopName: 'Dadar TT Circle', city: 'Mumbai', landmark: 'Near Swami Narayan Temple', stopType: 'boarding', order: 1 },
        { stopName: 'Vashi Plaza', city: 'Navi Mumbai', landmark: 'Highway Bridge', stopType: 'boarding', order: 2, durationOffsetMinutes: 45 },
        { stopName: 'Wakad Bridge', city: 'Pune', landmark: 'Ginger Hotel Junction', stopType: 'dropping', order: 3, durationOffsetMinutes: 180 },
        { stopName: 'Swargate Bus Terminal', city: 'Pune', landmark: 'Main Gate', stopType: 'dropping', order: 4, durationOffsetMinutes: 210 },
      ],
    },
    {
      sourceCity: 'Bengaluru',
      sourceState: 'Karnataka',
      destinationCity: 'Chennai',
      destinationState: 'Tamil Nadu',
      distanceKm: 350,
      estimatedDurationMinutes: 360, // 6 hours
      stops: [
        { stopName: 'Madiwala', city: 'Bengaluru', landmark: 'Near Police Station', stopType: 'boarding', order: 1 },
        { stopName: 'Electronic City Toll', city: 'Bengaluru', landmark: 'Phase 1', stopType: 'boarding', order: 2, durationOffsetMinutes: 25 },
        { stopName: 'Hosur Bus Stand', city: 'Hosur', landmark: 'Ring Road', stopType: 'both', order: 3, durationOffsetMinutes: 60 },
        { stopName: 'Koyambedu CMBT', city: 'Chennai', landmark: 'Private Bus Terminal', stopType: 'dropping', order: 4, durationOffsetMinutes: 360 },
      ],
    },
  ]);

  console.log('📅 Seeding Trips & Seat Inventories...');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const trips = await Trip.insertMany([
    {
      tripCode: `TRIP-${tomorrow.toISOString().slice(0, 10).replace(/-/g, '')}-BLR-HYD`,
      busId: buses[0]._id,
      operatorId: operators[0]._id,
      routeId: routes[0]._id,
      departureDate: tomorrow,
      departureTime: '21:30',
      arrivalDate: tomorrow,
      arrivalTime: '06:30',
      fares: { seater: 799, sleeper: 1199 },
      boardingPoints: [
        { pointName: 'Majestic Bus Stand', landmark: 'Platform 3', time: '21:30' },
        { pointName: 'Hebbal Flyover', landmark: 'Near Esteem Mall', time: '22:00' },
      ],
      droppingPoints: [
        { pointName: 'Shamshabad Airport Road', landmark: 'PVNR Entry', time: '05:45' },
        { pointName: 'Ameerpet Metro', landmark: 'Opposite Big Bazaar', time: '06:30' },
      ],
      totalSeats: buses[0].totalSeats,
      availableSeats: buses[0].totalSeats,
      status: 'scheduled',
    },
    {
      tripCode: `TRIP-${tomorrow.toISOString().slice(0, 10).replace(/-/g, '')}-MUM-PUN`,
      busId: buses[1]._id,
      operatorId: operators[1]._id,
      routeId: routes[1]._id,
      departureDate: tomorrow,
      departureTime: '07:00',
      arrivalDate: tomorrow,
      arrivalTime: '10:30',
      fares: { seater: 450, sleeper: 0 },
      boardingPoints: [
        { pointName: 'Dadar TT Circle', landmark: 'Near Swami Narayan Temple', time: '07:00' },
        { pointName: 'Vashi Plaza', landmark: 'Highway Bridge', time: '07:45' },
      ],
      droppingPoints: [
        { pointName: 'Wakad Bridge', landmark: 'Ginger Hotel Junction', time: '10:00' },
        { pointName: 'Swargate Bus Terminal', landmark: 'Main Gate', time: '10:30' },
      ],
      totalSeats: buses[1].totalSeats,
      availableSeats: buses[1].totalSeats,
      status: 'scheduled',
    },
    {
      tripCode: `TRIP-${dayAfterTomorrow.toISOString().slice(0, 10).replace(/-/g, '')}-BLR-CHN`,
      busId: buses[0]._id,
      operatorId: operators[0]._id,
      routeId: routes[2]._id,
      departureDate: dayAfterTomorrow,
      departureTime: '14:00',
      arrivalDate: dayAfterTomorrow,
      arrivalTime: '20:00',
      fares: { seater: 599, sleeper: 899 },
      boardingPoints: [
        { pointName: 'Madiwala', landmark: 'Near Police Station', time: '14:00' },
        { pointName: 'Electronic City Toll', landmark: 'Phase 1', time: '14:25' },
      ],
      droppingPoints: [
        { pointName: 'Koyambedu CMBT', landmark: 'Private Bus Terminal', time: '20:00' },
      ],
      totalSeats: buses[0].totalSeats,
      availableSeats: buses[0].totalSeats,
      status: 'scheduled',
    },
  ]);

  // Create Trip Seats for Trip 1
  console.log('🪑 Populating Seat Inventories for scheduled trips...');
  for (const trip of trips) {
    const bus = buses.find((b) => b._id.toString() === trip.busId.toString());
    const seatDocs = bus.seatTemplate.map((tmpl) => ({
      tripId: trip._id,
      busId: bus._id,
      seatNumber: tmpl.seatNumber,
      deck: tmpl.deck,
      seatType: tmpl.seatType,
      row: tmpl.row,
      column: tmpl.column,
      fare: tmpl.seatType === 'sleeper' ? trip.fares.sleeper : trip.fares.seater,
      status: 'available',
      isLadiesOnly: tmpl.isLadiesOnly,
    }));
    await Seat.insertMany(seatDocs);
  }

  console.log('📝 Creating initial demo booking...');
  // Reserve seat A1 on trip 0 for John Doe
  const seatA1 = await Seat.findOne({ tripId: trips[0]._id, seatNumber: 'A1' });
  const demoBooking = await Booking.create({
    userId: users[2]._id,
    tripId: trips[0]._id,
    operatorId: operators[0]._id,
    busId: buses[0]._id,
    routeId: routes[0]._id,
    passengers: [
      {
        seatNumber: 'A1',
        deck: 'lower',
        seatType: 'seater',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        fare: 799,
      },
    ],
    totalSeats: 1,
    totalBaseFare: 799,
    gstAmount: 40,
    discountAmount: 0,
    totalAmount: 839,
    boardingPoint: trips[0].boardingPoints[0],
    droppingPoint: trips[0].droppingPoints[1],
    contactDetails: {
      email: users[2].email,
      phone: users[2].phone,
    },
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
  });

  // Update seat A1 to booked
  seatA1.status = 'booked';
  seatA1.bookingId = demoBooking._id;
  seatA1.passenger = { name: 'John Doe', age: 28, gender: 'male' };
  await seatA1.save();

  // Create payment record for demo booking
  await Payment.create({
    bookingId: demoBooking._id,
    userId: users[2]._id,
    amount: 839,
    gateway: 'razorpay',
    razorpayOrderId: 'order_test_demo12345',
    razorpayPaymentId: 'pay_test_demo12345',
    status: 'captured',
  });

  // Decrement trip available seats
  trips[0].availableSeats -= 1;
  await trips[0].save();

  // Record audit log
  await AuditLog.create({
    userId: users[2]._id,
    userName: users[2].name,
    userRole: users[2].role,
    action: 'BOOKING_CONFIRM',
    entityType: 'Booking',
    entityId: demoBooking._id.toString(),
    details: { pnr: demoBooking.pnr, seats: ['A1'], amount: 839 },
  });

  console.log('\n=========================================');
  console.log('🎉 Seeding successfully completed!');
  console.log('=========================================');
  console.log('Demo Credentials:');
  console.log('  Admin:    admin@busbooking.com   | Admin@123456');
  console.log('  Operator: operator@travels.com   | Operator@123');
  console.log('  Customer: john@example.com       | Customer@123');
  console.log(`Demo Booking PNR: ${demoBooking.pnr}`);
  console.log('=========================================\n');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
