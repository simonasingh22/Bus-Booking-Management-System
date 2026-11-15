const express = require('express');
const router = express.Router();
const {
  estimateRefund,
  cancelBooking,
  getMyCancellations,
} = require('./cancellations.controller');
const { protect } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Cancellations
 *   description: Configurable tiered cancellation policies, simulated refunds, and automated seat release
 */

router.use(protect);

/**
 * @swagger
 * /cancellations/estimate/{bookingId}:
 *   get:
 *     summary: Preview cancellation refund and policy penalty before confirming
 *     tags: [Cancellations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund estimate preview
 */
router.get('/estimate/:bookingId', estimateRefund);

/**
 * @swagger
 * /cancellations:
 *   post:
 *     summary: Confirm booking cancellation, release seats back to inventory, and credit simulated refund
 *     tags: [Cancellations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled and refund processed
 */
router.post('/', cancelBooking);

/**
 * @swagger
 * /cancellations/my-cancellations:
 *   get:
 *     summary: Get all cancelled bookings and refund transaction records for the logged-in user
 *     tags: [Cancellations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user cancellations
 */
router.get('/my-cancellations', getMyCancellations);

module.exports = router;
