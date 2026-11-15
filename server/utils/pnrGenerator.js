const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique PNR (Passenger Name Record) in the format:
 * BUS-YYYYMMDD-XXXXXXXX  (uppercase alphanumeric)
 */
const generatePNR = () => {
  const date = new Date();
  const dateStr =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const unique = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 8);
  return `BUS-${dateStr}-${unique}`;
};

module.exports = { generatePNR };
