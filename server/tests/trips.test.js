const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Trips & Seat Concurrency Unit Tests', () => {
  it('should calculate correct fare for seater and sleeper seats with offset', () => {
    const tripFares = { seater: 750, sleeper: 1200 };

    const calculateFare = (seatType, basePriceOffset = 0) => {
      const base = seatType === 'sleeper' ? tripFares.sleeper : tripFares.seater;
      return base + basePriceOffset;
    };

    assert.strictEqual(calculateFare('seater', 0), 750);
    assert.strictEqual(calculateFare('sleeper', 250), 1450);
    assert.strictEqual(calculateFare('seater', 50), 800);
  });

  it('should format route duration into human-readable hours and minutes', () => {
    const formatDuration = (mins) => {
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim();
    };

    assert.strictEqual(formatDuration(540), '9h');
    assert.strictEqual(formatDuration(210), '3h 30m');
    assert.strictEqual(formatDuration(45), '0h 45m');
  });

  it('should simulate atomic seat lock concurrency and prevent race condition', () => {
    // In-memory atomic state simulator replicating MongoDB findOneAndUpdate condition
    const tripSeats = [
      { seatNumber: 'A1', status: 'available', lockedBy: null, lockExpiresAt: null },
      { seatNumber: 'A2', status: 'available', lockedBy: null, lockExpiresAt: null },
    ];

    const atomicLockSeat = (seatNumber, userId, now = new Date()) => {
      const seat = tripSeats.find((s) => s.seatNumber === seatNumber);
      if (!seat) return null;

      // Condition: status === 'available' OR (status === 'locked' && lockExpiresAt < now)
      const isAvailable =
        seat.status === 'available' ||
        (seat.status === 'locked' && seat.lockExpiresAt < now);

      if (!isAvailable) {
        return null; // Lock failed: conflict!
      }

      // Update
      seat.status = 'locked';
      seat.lockedBy = userId;
      seat.lockExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      return seat;
    };

    const user1Id = 'user_alice_123';
    const user2Id = 'user_bob_456';
    const now = new Date();

    // User 1 requests seat A1
    const lock1 = atomicLockSeat('A1', user1Id, now);
    assert.ok(lock1, 'User 1 should successfully lock seat A1');
    assert.strictEqual(lock1.status, 'locked');
    assert.strictEqual(lock1.lockedBy, user1Id);

    // User 2 simultaneously attempts to lock seat A1
    const lock2 = atomicLockSeat('A1', user2Id, now);
    assert.strictEqual(lock2, null, 'User 2 attempt MUST fail due to existing active lock');

    // User 2 locks seat A2 instead
    const lock3 = atomicLockSeat('A2', user2Id, now);
    assert.ok(lock3, 'User 2 should successfully lock seat A2');
    assert.strictEqual(lock3.status, 'locked');
    assert.strictEqual(lock3.lockedBy, user2Id);
  });

  it('should allow takeover of seat when previous lock has expired', () => {
    const expiredTime = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
    const tripSeat = {
      seatNumber: 'B1',
      status: 'locked',
      lockedBy: 'previous_user',
      lockExpiresAt: expiredTime,
    };

    const atomicLockSeat = (seat, userId, now = new Date()) => {
      const isAvailable =
        seat.status === 'available' ||
        (seat.status === 'locked' && seat.lockExpiresAt < now);

      if (!isAvailable) return null;

      seat.status = 'locked';
      seat.lockedBy = userId;
      seat.lockExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      return seat;
    };

    const takeoverResult = atomicLockSeat(tripSeat, 'new_user', new Date());
    assert.ok(takeoverResult, 'New user should take over expired seat lock');
    assert.strictEqual(takeoverResult.lockedBy, 'new_user');
  });
});
