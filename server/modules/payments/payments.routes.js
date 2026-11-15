const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentById,
} = require('./payments.controller');
const { protect } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Razorpay order generation, HMAC SHA256 signature verification, and test mode simulation
 */

router.use(protect);

/**
 * @swagger
 * /payments/create-order:
 *   post:
 *     summary: Generate a Razorpay order in test mode
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: INR
 *               bookingId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Razorpay order created
 */
router.post('/create-order', createOrder);

/**
 * @swagger
 * /payments/verify:
 *   post:
 *     summary: Verify Razorpay signature and capture payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId]
 *     responses:
 *       200:
 *         description: Payment verified and captured
 *       400:
 *         description: Invalid signature
 */
router.post('/verify', verifyPayment);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment record details
 */
router.get('/:id', getPaymentById);

module.exports = router;
