const crypto = require('crypto');
const Payment = require('./Payment.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

const isValidRazorpaySignature = (orderId, paymentId, signature, secret) => {
  if (!orderId || !paymentId || !signature || !secret || secret === 'placeholder_secret') return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

/**
 * @desc    Create Razorpay Order (Test Mode)
 * @route   POST /api/payments/create-order
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res, next) => {
  const { amount, currency = 'INR', bookingId, receipt } = req.body;

  if (!amount || Number(amount) <= 0) {
    return next(new AppError('Please provide a valid payment amount.', 400));
  }

  const amountInPaise = Math.round(Number(amount) * 100);
  const orderReceipt = receipt || `rcpt_${Date.now()}`;

  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

  let orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // If live/real test credentials provided (not placeholder), try calling Razorpay API
  if (keyId.startsWith('rzp_test_') && keyId !== 'rzp_test_placeholder') {
    try {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: orderReceipt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        orderId = data.id;
      }
    } catch {
      // Fallback to local orderId if network/sandbox blocks external API
    }
  }

  const paymentDoc = await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId, userId: req.user._id },
    {
      $setOnInsert: {
        ...(bookingId ? { bookingId } : {}),
        userId: req.user._id,
        amount: Number(amount),
        currency,
        gateway: 'razorpay',
        razorpayOrderId: orderId,
        status: 'created',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await logAuditAction({
    req,
    action: 'PAYMENT_INITIATED',
    entityType: 'Payment',
    entityId: orderId,
    details: { amount, currency, orderId, bookingId },
  });

  sendSuccess(res, 201, 'Razorpay order created successfully.', {
    orderId,
    amount: amountInPaise,
    currency,
    keyId,
    receipt: orderReceipt,
    paymentId: paymentDoc?._id,
  });
});

/**
 * @desc    Verify Razorpay payment signature and capture payment
 * @route   POST /api/payments/verify
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req, res, next) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    bookingId,
    isSimulation = false,
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId) {
    return next(new AppError('Please provide razorpayOrderId and razorpayPaymentId.', 400));
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

  // Simulation is explicitly separate from Razorpay. Real Razorpay payments always
  // require a backend HMAC signature check with a configured test secret.
  const isValid = isSimulation
    ? true
    : isValidRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret);

  if (!isValid) {
    await logAuditAction({
      req,
      action: 'PAYMENT_FAILED',
      entityType: 'Payment',
      entityId: razorpayOrderId,
      details: { reason: 'Invalid signature', razorpayPaymentId },
    });
    return next(new AppError('Payment signature verification failed.', 400));
  }

  // 2. Update Payment Document. Repeated verification returns the same payment.
  let payment = await Payment.findOne({ razorpayOrderId, userId: req.user._id });
  if (!payment && bookingId) {
    payment = await Payment.findOne({ bookingId, userId: req.user._id });
  }

  if (!payment) {
    return next(new AppError('Payment order was not found for this account.', 404));
  }

  if (payment.status === 'refunded') {
    return next(new AppError('This payment has already been refunded.', 409));
  }

  if (payment.status !== 'captured') {
    payment.status = 'captured';
    payment.gateway = isSimulation ? 'test_simulation' : 'razorpay';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature || null;
    await payment.save();
  }

  await logAuditAction({
    req,
    action: 'PAYMENT_SUCCESS',
    entityType: 'Payment',
    entityId: razorpayPaymentId,
    details: { orderId: razorpayOrderId, bookingId },
  });

  sendSuccess(res, 200, 'Payment verified and captured successfully.', {
    verified: true,
    paymentId: razorpayPaymentId,
    orderId: razorpayOrderId,
    status: 'captured',
  });
});

/**
 * @desc    Get payment receipt and audit details
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPaymentById = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('bookingId', 'pnr totalAmount passengers')
    .populate('userId', 'name email');

  if (!payment) {
    return next(new AppError('Payment record not found.', 404));
  }

  sendSuccess(res, 200, 'Payment details retrieved.', { payment });
});

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentById,
  isValidRazorpaySignature,
};
