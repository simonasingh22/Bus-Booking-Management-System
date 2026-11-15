const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  calculateFinancials,
  isSettledBooking,
} = require('../modules/reports/reports.controller');

describe('Reports & Passenger Manifest Unit Tests', () => {
  it('should calculate accurate seat occupancy percentages', () => {
    const calculateOccupancy = (booked, total) => {
      if (!total || total <= 0) return 0;
      return Math.round((booked / total) * 100);
    };

    assert.strictEqual(calculateOccupancy(30, 40), 75);
    assert.strictEqual(calculateOccupancy(36, 36), 100);
    assert.strictEqual(calculateOccupancy(0, 40), 0);
    assert.strictEqual(calculateOccupancy(13, 30), 43);
  });

  it('should reconcile passenger manifests with confirmed bookings', () => {
    const confirmedBookings = [
      {
        pnr: 'BUS-20261115-AAAA1111',
        contactDetails: { email: 'alice@example.com', phone: '9876543210' },
        boardingPoint: { pointName: 'Majestic', time: '21:30' },
        passengers: [
          { seatNumber: 'A1', name: 'Alice Smith', age: 29, gender: 'female', fare: 800 },
          { seatNumber: 'A2', name: 'Bob Smith', age: 31, gender: 'male', fare: 800 },
        ],
      },
      {
        pnr: 'BUS-20261115-BBBB2222',
        contactDetails: { email: 'charlie@example.com', phone: '9845012345' },
        boardingPoint: { pointName: 'Hebbal', time: '22:00' },
        passengers: [
          { seatNumber: 'B1', name: 'Charlie Green', age: 45, gender: 'male', fare: 800 },
        ],
      },
    ];

    // Build reconciled manifest
    const manifest = [];
    confirmedBookings.forEach((b) => {
      b.passengers.forEach((p) => {
        manifest.push({
          seatNumber: p.seatNumber,
          passengerName: p.name,
          pnr: b.pnr,
          boardingPoint: b.boardingPoint.pointName,
          phone: b.contactDetails.phone,
        });
      });
    });

    manifest.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));

    assert.strictEqual(manifest.length, 3, 'Manifest must reconcile all 3 passengers');
    assert.strictEqual(manifest[0].seatNumber, 'A1');
    assert.strictEqual(manifest[0].pnr, 'BUS-20261115-AAAA1111');
    assert.strictEqual(manifest[2].seatNumber, 'B1');
    assert.strictEqual(manifest[2].passengerName, 'Charlie Green');
  });

  it('should verify audit log payload attributes', () => {
    const log = {
      action: 'BOOKING_CONFIRM',
      entityType: 'Booking',
      entityId: '65f123456789abcdef123456',
      userId: 'user_123',
      userName: 'John Doe',
      userRole: 'customer',
      timestamp: new Date(),
    };

    assert.ok(log.action);
    assert.ok(log.entityType);
    assert.ok(log.timestamp instanceof Date);
    assert.strictEqual(log.action, 'BOOKING_CONFIRM');
  });

  it('should report base fare, GST, gross sales, refunds and net settled receipts separately', () => {
    const bookings = [
      {
        _id: 'booking-1',
        totalBaseFare: 1199,
        gstAmount: 60,
        totalAmount: 1259,
      },
    ];
    const payments = [
      {
        bookingId: 'booking-1',
        refund: { status: 'none', amount: 0 },
      },
    ];

    assert.deepStrictEqual(
      calculateFinancials(bookings, payments),
      {
        grossCustomerSales: 1259,
        baseFareRevenue: 1199,
        gstCollected: 60,
        processedRefunds: 0,
        netSettledReceipts: 1259,
        paymentByBookingId: new Map([['booking-1', payments[0]]]),
      }
    );
  });

  it('should exclude cancelled and confirmed-but-unpaid bookings from settled reports', () => {
    assert.strictEqual(isSettledBooking({ bookingStatus: 'confirmed', paymentStatus: 'paid' }), true);
    assert.strictEqual(isSettledBooking({ bookingStatus: 'cancelled', paymentStatus: 'paid' }), false);
    assert.strictEqual(isSettledBooking({ bookingStatus: 'confirmed', paymentStatus: 'pending' }), false);
    assert.strictEqual(isSettledBooking({ bookingStatus: 'confirmed', paymentStatus: 'failed' }), false);
  });

  it('should count occupancy only from settled bookings', () => {
    const bookings = [
      { bookingStatus: 'confirmed', paymentStatus: 'paid', passengers: [{ seatNumber: 'A1' }] },
      { bookingStatus: 'cancelled', paymentStatus: 'paid', passengers: [{ seatNumber: 'A2' }] },
      { bookingStatus: 'confirmed', paymentStatus: 'pending', passengers: [{ seatNumber: 'A3' }] },
    ];

    const occupiedSeats = bookings
      .filter(isSettledBooking)
      .reduce((count, booking) => count + booking.passengers.length, 0);

    assert.strictEqual(occupiedSeats, 1);
  });

  it('should subtract only processed refunds from net settled receipts', () => {
    const financials = calculateFinancials(
      [{ totalBaseFare: 1199, gstAmount: 60, totalAmount: 1259 }],
      [{ bookingId: 'booking-1', refund: { status: 'processed', amount: 500 } }]
    );

    assert.strictEqual(financials.grossCustomerSales, 1259);
    assert.strictEqual(financials.processedRefunds, 500);
    assert.strictEqual(financials.netSettledReceipts, 759);
  });
});
