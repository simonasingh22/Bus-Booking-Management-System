const { describe, it } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { restrictTo } = require('../middleware/auth');
const { generatePNR } = require('../utils/pnrGenerator');

describe('Auth & Security Unit Tests', () => {
  const secretKey = 'test_jwt_secret_key_12345';

  it('should hash password and verify with bcrypt correctly', async () => {
    const rawPassword = 'Password@123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.notStrictEqual(hash, rawPassword);
    const isValid = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isValid, true);

    const isInvalid = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isInvalid, false);
  });

  it('should sign and verify JWT tokens with payload', () => {
    const payload = { id: '65f123456789abcdef123456', role: 'customer' };
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

    assert.ok(token);
    assert.strictEqual(typeof token, 'string');

    const decoded = jwt.verify(token, secretKey);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.role, payload.role);
  });

  it('should reject invalid or expired JWT tokens', () => {
    assert.throws(() => {
      jwt.verify('invalid.token.structure', secretKey);
    });
  });

  it('should enforce Role-Based Access Control (RBAC) via restrictTo middleware', () => {
    const adminOnly = restrictTo('admin');

    // Case 1: Unauthorized customer
    let nextCalledWithError = false;
    const customerReq = { user: { role: 'customer' } };
    adminOnly(customerReq, {}, (err) => {
      if (err && err.statusCode === 403) {
        nextCalledWithError = true;
      }
    });
    assert.strictEqual(nextCalledWithError, true, 'Customer must be blocked with 403 from admin routes');

    // Case 2: Authorized admin
    let nextCalledSuccess = false;
    const adminReq = { user: { role: 'admin' } };
    adminOnly(adminReq, {}, (err) => {
      if (!err) {
        nextCalledSuccess = true;
      }
    });
    assert.strictEqual(nextCalledSuccess, true, 'Admin should be granted access');
  });

  it('should generate valid PNR format BUS-YYYYMMDD-XXXXXXXX', () => {
    const pnr = generatePNR();
    assert.ok(pnr);
    assert.match(pnr, /^BUS-\d{8}-[A-F0-9]{8}$/);
  });
});
