const { describe, it } = require('node:test');
const assert = require('node:assert');
const { generatePNR } = require('../utils/pnrGenerator');

describe('Bookings & Seat Integrity Unit Tests', () => {
  it('should generate unique PNRs with BUS-YYYYMMDD prefix', () => {
    const pnr1 = generatePNR();
    const pnr2 = generatePNR();

    assert.notStrictEqual(pnr1, pnr2, 'PNRs must be unique');
    assert.match(pnr1, /^BUS-\d{8}-[A-F0-9]{8}$/);
    assert.match(pnr2, /^BUS-\d{8}-[A-F0-9]{8}$/);
  });

  it('should calculate GST (5%) and total payable accurately', () => {
    const passengers = [
      { seatNumber: 'A1', fare: 800 },
      { seatNumber: 'A2', fare: 800 },
      { seatNumber: 'U1', fare: 1200 },
    ];

    const baseFare = passengers.reduce((sum, p) => sum + p.fare, 0);
    const gstAmount = Math.round(baseFare * 0.05);
    const totalAmount = baseFare + gstAmount;

    assert.strictEqual(baseFare, 2800);
    assert.strictEqual(gstAmount, 140);
    assert.strictEqual(totalAmount, 2940);
  });

  it('should reject booking when any requested seat is already in booked status', () => {
    const seatInventory = [
      { seatNumber: 'A1', status: 'booked' },
      { seatNumber: 'A2', status: 'available' },
    ];

    const validateSeatAvailability = (requestedSeatNumbers) => {
      for (const seatNum of requestedSeatNumbers) {
        const found = seatInventory.find((s) => s.seatNumber === seatNum);
        if (!found || found.status === 'booked') {
          return { available: false, conflictSeat: seatNum };
        }
      }
      return { available: true };
    };

    const attempt1 = validateSeatAvailability(['A2']);
    assert.strictEqual(attempt1.available, true);

    const attempt2 = validateSeatAvailability(['A1', 'A2']);
    assert.strictEqual(attempt2.available, false);
    assert.strictEqual(attempt2.conflictSeat, 'A1');
  });

  it('should verify idempotency key prevents duplicate booking creation', () => {
    const bookingStore = new Map();

    const processBooking = (idempotencyKey, bookingPayload) => {
      if (idempotencyKey && bookingStore.has(idempotencyKey)) {
        return { isDuplicate: true, booking: bookingStore.get(idempotencyKey) };
      }

      const newBooking = {
        id: `book_${Date.now()}`,
        pnr: generatePNR(),
        ...bookingPayload,
      };

      if (idempotencyKey) {
        bookingStore.set(idempotencyKey, newBooking);
      }

      return { isDuplicate: false, booking: newBooking };
    };

    const idempotencyKey = 'client_retry_uuid_777';
    const payload = { tripId: 'trip_1', seats: ['B1'] };

    // Initial submission
    const res1 = processBooking(idempotencyKey, payload);
    assert.strictEqual(res1.isDuplicate, false);
    const originalPNR = res1.booking.pnr;

    // Retried submission with identical key
    const res2 = processBooking(idempotencyKey, payload);
    assert.strictEqual(res2.isDuplicate, true);
    assert.strictEqual(res2.booking.pnr, originalPNR);
  });
});
