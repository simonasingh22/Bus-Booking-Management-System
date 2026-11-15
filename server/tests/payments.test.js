const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

describe('Payments & Razorpay Security Unit Tests', () => {
  const testSecret = 'rzp_secret_test_998877';

  it('should accurately verify authentic Razorpay HMAC SHA256 signatures', () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';

    // Generate legitimate signature
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verifySignature = (order, payment, signature, secret) => {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${order}|${payment}`)
        .digest('hex');
      return expected === signature;
    };

    assert.strictEqual(
      verifySignature(orderId, paymentId, validSignature, testSecret),
      true,
      'Valid signature must verify successfully'
    );

    // Tampered paymentId
    assert.strictEqual(
      verifySignature(orderId, 'pay_tampered', validSignature, testSecret),
      false,
      'Tampered payment ID must be rejected'
    );

    // Tampered signature
    assert.strictEqual(
      verifySignature(orderId, paymentId, 'invalid_signature_hex', testSecret),
      false,
      'Invalid signature must fail'
    );
  });

  it('should correctly convert Rupee amounts to Paise for payment gateway', () => {
    const toPaise = (rupees) => Math.round(Number(rupees) * 100);

    assert.strictEqual(toPaise(799), 79900);
    assert.strictEqual(toPaise(1250), 125000);
    assert.strictEqual(toPaise(450.5), 45050);
  });
});
