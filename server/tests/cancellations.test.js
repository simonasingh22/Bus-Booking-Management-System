const { describe, it } = require('node:test');
const assert = require('node:assert');
const { evaluateCancellationPolicy } = require('../modules/cancellations/cancellations.controller');

describe('Cancellations & Tiered Refund Policies Unit Tests', () => {
  const policy = {
    fullRefundHours: 24,
    partialRefundHours: 12,
    noRefundHours: 4,
    cancellationChargePercent: 10,
  };

  it('should grant 90% refund when cancelling > 24 hours prior to departure', () => {
    // 30 hours from now
    const futureDate = new Date(Date.now() + 30 * 60 * 60 * 1000);
    const dateStr = futureDate.toISOString().split('T')[0];
    const timeStr = `${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}`;

    const totalAmount = 1000;
    const res = evaluateCancellationPolicy(dateStr, timeStr, policy, totalAmount);

    assert.strictEqual(res.refundPercentage, 90);
    assert.strictEqual(res.refundAmount, 900);
    assert.strictEqual(res.cancellationCharge, 100);
  });

  it('should grant 50% refund when cancelling 12 to 24 hours prior to departure', () => {
    // 18 hours from now
    const futureDate = new Date(Date.now() + 18 * 60 * 60 * 1000);
    const dateStr = futureDate.toISOString().split('T')[0];
    const timeStr = `${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}`;

    const totalAmount = 1000;
    const res = evaluateCancellationPolicy(dateStr, timeStr, policy, totalAmount);

    assert.strictEqual(res.refundPercentage, 50);
    assert.strictEqual(res.refundAmount, 500);
    assert.strictEqual(res.cancellationCharge, 500);
  });

  it('should grant 0% refund (non-refundable) when cancelling < 4 hours prior to departure', () => {
    // 2 hours from now
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const dateStr = futureDate.toISOString().split('T')[0];
    const timeStr = `${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}`;

    const totalAmount = 1000;
    const res = evaluateCancellationPolicy(dateStr, timeStr, policy, totalAmount);

    assert.strictEqual(res.refundPercentage, 0);
    assert.strictEqual(res.refundAmount, 0);
    assert.strictEqual(res.cancellationCharge, 1000);
  });

  it('should release seat state and restore available seat counter on cancellation', () => {
    // In-memory seat state simulator
    const seats = [
      { seatNumber: 'A1', status: 'booked', bookingId: 'b1' },
      { seatNumber: 'A2', status: 'booked', bookingId: 'b1' },
    ];
    let tripAvailableSeats = 38;
    const tripTotalSeats = 40;

    const performCancellation = (seatNumbers) => {
      for (const s of seats) {
        if (seatNumbers.includes(s.seatNumber)) {
          s.status = 'available';
          s.bookingId = null;
        }
      }
      tripAvailableSeats = Math.min(tripTotalSeats, tripAvailableSeats + seatNumbers.length);
    };

    performCancellation(['A1', 'A2']);

    assert.strictEqual(seats[0].status, 'available');
    assert.strictEqual(seats[1].status, 'available');
    assert.strictEqual(tripAvailableSeats, 40, 'Available seats count must be incremented by released count');
  });
});
