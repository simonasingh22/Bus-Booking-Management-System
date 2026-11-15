/**
 * Utility to generate standard Indian bus seat layouts and matrices
 */
const generateSeatTemplate = ({
  totalSeats = 40,
  layoutType = '2x2',
  busType = 'AC Seater',
  deckType = 'single',
}) => {
  const seats = [];
  const isSleeper = busType.includes('Sleeper') && !busType.includes('Hybrid');
  const isHybrid = busType.includes('Hybrid');

  if (isHybrid || deckType === 'double') {
    // Double deck / Hybrid bus
    const seatsPerDeck = Math.ceil(totalSeats / 2);

    // Lower Deck (Typically Seater or Lower Sleeper)
    let lowerCount = 0;
    const lowerCols = layoutType === '2x1' || layoutType === 'sleeper-2x1' ? 3 : 4;
    const lowerRows = Math.ceil(seatsPerDeck / lowerCols);

    for (let r = 1; r <= lowerRows && lowerCount < seatsPerDeck; r++) {
      for (let c = 1; c <= lowerCols && lowerCount < seatsPerDeck; c++) {
        lowerCount++;
        const seatNum = `L${lowerCount}`;
        const isLadies = c === 1 && r <= 2;
        seats.push({
          seatNumber: seatNum,
          deck: 'lower',
          seatType: isSleeper ? 'sleeper' : 'seater',
          row: r,
          column: c,
          isLadiesOnly: isLadies,
          basePriceOffset: 0,
        });
      }
    }

    // Upper Deck (Typically Sleeper)
    let upperCount = 0;
    const upperCols = 3; // Standard 2x1 sleeper upper
    const upperRows = Math.ceil((totalSeats - lowerCount) / upperCols);

    for (let r = 1; r <= upperRows && seats.length < totalSeats; r++) {
      for (let c = 1; c <= upperCols && seats.length < totalSeats; c++) {
        upperCount++;
        const seatNum = `U${upperCount}`;
        seats.push({
          seatNumber: seatNum,
          deck: 'upper',
          seatType: 'sleeper',
          row: r,
          column: c,
          isLadiesOnly: false,
          basePriceOffset: 250, // Premium for sleeper berth
        });
      }
    }
  } else {
    // Single Deck
    const cols = layoutType === '2x1' || layoutType === '1x2' || layoutType === 'sleeper-2x1' ? 3 : 4;
    const rows = Math.ceil(totalSeats / cols);
    let count = 0;

    for (let r = 1; r <= rows && count < totalSeats; r++) {
      for (let c = 1; c <= cols && count < totalSeats; c++) {
        count++;
        const rowLetter = String.fromCharCode(64 + r); // A, B, C...
        const seatNum = `${rowLetter}${c}`;
        const isLadies = c === 1 && r <= 2; // First 2 window seats

        seats.push({
          seatNumber: seatNum,
          deck: 'lower',
          seatType: isSleeper ? 'sleeper' : 'seater',
          row: r,
          column: c,
          isLadiesOnly: isLadies,
          basePriceOffset: isSleeper ? 200 : 0,
        });
      }
    }
  }

  return seats;
};

module.exports = { generateSeatTemplate };
