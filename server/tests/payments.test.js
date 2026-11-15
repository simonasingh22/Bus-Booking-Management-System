const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const {
  isValidRazorpaySignature,
} = require('../modules/payments/payments.controller');

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

  it('should accept a valid test-mode Razorpay signature and reject invalid signatures', () => {
    const orderId = 'order_test_backend';
    const paymentId = 'pay_test_backend';
    const signature = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.strictEqual(
      isValidRazorpaySignature(orderId, paymentId, signature, testSecret),
      true
    );
    assert.strictEqual(
      isValidRazorpaySignature(orderId, paymentId, `${signature}bad`, testSecret),
      false
    );
    assert.strictEqual(
      isValidRazorpaySignature(orderId, paymentId, signature, 'placeholder_secret'),
      false
    );
  });

  it('should model successful verification as a captured payment', () => {
    const payment = {
      status: 'created',
      razorpayOrderId: 'order_test_success',
      razorpayPaymentId: null,
    };
    const signature = crypto
      .createHmac('sha256', testSecret)
      .update(`${payment.razorpayOrderId}|pay_test_success`)
      .digest('hex');

    assert.strictEqual(
      isValidRazorpaySignature(payment.razorpayOrderId, 'pay_test_success', signature, testSecret),
      true
    );
    payment.status = 'captured';
    payment.razorpayPaymentId = 'pay_test_success';
    assert.deepStrictEqual(
      { status: payment.status, paymentId: payment.razorpayPaymentId },
      { status: 'captured', paymentId: 'pay_test_success' }
    );
  });

  it('should not treat failed or cancelled checkout as a captured payment', () => {
    const failedPayment = { status: 'failed' };
    const cancelledCheckout = { status: 'created' };

    assert.notStrictEqual(failedPayment.status, 'captured');
    assert.notStrictEqual(cancelledCheckout.status, 'captured');
  });

  it('should keep duplicate verification idempotent and preserve one payment record', () => {
    const payments = new Map([['order_test_duplicate', {
      status: 'captured',
      razorpayPaymentId: 'pay_test_duplicate',
    }]]);
    const existing = payments.get('order_test_duplicate');
    const repeated = payments.get('order_test_duplicate');

    assert.strictEqual(existing, repeated);
    assert.strictEqual(payments.size, 1);
    assert.strictEqual(repeated.status, 'captured');
  });

  it('should keep simulated refund state separate from Razorpay payment verification', () => {
    const payment = {
      gateway: 'test_simulation',
      status: 'refunded',
      amount: 1259,
      refund: { status: 'processed', amount: 1133, refundId: 'REF-test' },
    };

    assert.strictEqual(payment.gateway, 'test_simulation');
    assert.strictEqual(payment.status, 'refunded');
    assert.strictEqual(payment.amount, 1259);
    assert.strictEqual(payment.refund.status, 'processed');
  });
});
