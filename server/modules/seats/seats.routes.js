const express = require('express');
const router = express.Router();
const {
  getSeatsByTrip,
  lockSeats,
  releaseSeats,
} = require('./seats.controller');
const { protect } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Seats
 *   description: Real-time seat inventory, deck layouts, and atomic locking
 */

/**
 * @swagger
 * /seats/trip/{tripId}:
 *   get:
 *     summary: Get live seat layout and booking availability for a trip
 *     tags: [Seats]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live seat inventory
 *       404:
 *         description: Trip not found
 */
router.get('/trip/:tripId', getSeatsByTrip);

// Protected actions: locking and releasing seats
router.use(protect);

/**
 * @swagger
 * /seats/lock:
 *   post:
 *     summary: Temporarily lock seats during checkout (prevents double-booking)
 *     tags: [Seats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, seatNumbers]
 *             properties:
 *               tripId:
 *                 type: string
 *               seatNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Seats locked successfully
 *       409:
 *         description: Concurrency conflict - seat already locked or booked
 */
router.post('/lock', lockSeats);

/**
 * @swagger
 * /seats/release:
 *   post:
 *     summary: Release temporary seat locks
 *     tags: [Seats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seats released
 */
router.post('/release', releaseSeats);

module.exports = router;
