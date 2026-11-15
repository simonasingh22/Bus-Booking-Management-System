const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookingById,
  getBookingByPNR,
  getMyBookings,
  getAllBookings,
} = require('./bookings.controller');
const { protect, restrictTo } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Reservation lifecycle, seat assignment, PNR lookups, and passenger manifests
 */

// Public PNR lookup
/**
 * @swagger
 * /bookings/pnr/{pnr}:
 *   get:
 *     summary: Look up ticket details by unique PNR
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: pnr
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details
 *       404:
 *         description: PNR not found
 */
router.get('/pnr/:pnr', getBookingByPNR);

// All subsequent booking routes require authentication
router.use(protect);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create confirmed booking, assign seats, and issue PNR
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, passengers, boardingPoint, droppingPoint, contactDetails]
 *     responses:
 *       201:
 *         description: Booking confirmed
 *       409:
 *         description: Seat conflict - seat already booked
 */
router.post('/', createBooking);

/**
 * @swagger
 * /bookings/my-bookings:
 *   get:
 *     summary: Get all bookings placed by current user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User bookings history
 */
router.get('/my-bookings', getMyBookings);

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: List all bookings directory (Admin/Operator)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings list
 */
router.get('/', restrictTo('admin', 'operator'), getAllBookings);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get single booking by MongoDB ID
 *     tags: [Bookings]
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
 *         description: Booking details
 */
router.get('/:id', getBookingById);

module.exports = router;
