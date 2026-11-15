const { describe, it } = require('node:test');
const assert = require('node:assert');
const { generateSeatTemplate } = require('../utils/seatLayoutGenerator');

describe('Bus & Seat Layout Generator Unit Tests', () => {
  it('should generate a standard 2x2 seater template with correct seat count and numbering', () => {
    const seats = generateSeatTemplate({
      totalSeats: 40,
      layoutType: '2x2',
      busType: 'AC Seater',
      deckType: 'single',
    });

    assert.strictEqual(seats.length, 40);
    assert.strictEqual(seats[0].seatNumber, 'A1');
    assert.strictEqual(seats[0].deck, 'lower');
    assert.strictEqual(seats[0].seatType, 'seater');
    assert.strictEqual(seats[0].isLadiesOnly, true, 'Window seat A1 should be marked ladies-only');
    assert.strictEqual(seats[1].isLadiesOnly, false);
  });

  it('should generate a hybrid double-deck layout with lower seater and upper sleeper', () => {
    const seats = generateSeatTemplate({
      totalSeats: 36,
      layoutType: '2x2',
      busType: 'AC Sleeper / Seater Hybrid',
      deckType: 'double',
    });

    assert.strictEqual(seats.length, 36);

    const lowerDeckSeats = seats.filter((s) => s.deck === 'lower');
    const upperDeckSeats = seats.filter((s) => s.deck === 'upper');

    assert.ok(lowerDeckSeats.length > 0);
    assert.ok(upperDeckSeats.length > 0);
    assert.strictEqual(lowerDeckSeats.length + upperDeckSeats.length, 36);

    // Upper deck should be sleepers with price offset
    assert.strictEqual(upperDeckSeats[0].seatType, 'sleeper');
    assert.strictEqual(upperDeckSeats[0].basePriceOffset, 250);
  });

  it('should generate a 2x1 sleeper layout with 3 columns per row', () => {
    const seats = generateSeatTemplate({
      totalSeats: 30,
      layoutType: '2x1',
      busType: 'AC Sleeper',
      deckType: 'single',
    });

    assert.strictEqual(seats.length, 30);
    const maxColumn = Math.max(...seats.map((s) => s.column));
    assert.strictEqual(maxColumn, 3, '2x1 layout should have at most 3 columns');
  });

  it('should validate Indian vehicle registration numbers correctly', () => {
    const regExp = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

    assert.ok(regExp.test('KA01AB1234'));
    assert.ok(regExp.test('MH12CD5678'));
    assert.ok(regExp.test('DL1A9999'));
    assert.ok(regExp.test('TN09XYZ1234'));

    assert.strictEqual(regExp.test('INVALID_NUMBER'), false);
    assert.strictEqual(regExp.test('12345'), false);
    assert.strictEqual(regExp.test('KA-01-AB-1234'), false); // Hyphens should be stripped before testing
  });
});
