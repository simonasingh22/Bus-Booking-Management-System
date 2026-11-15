const express = require('express');
const router = express.Router();
const {
  searchTrips,
  getTripById,
  createTrip,
  updateTripStatus,
  cancelTrip,
} = require('./trips.controller');
const { protect, restrictTo, optionalAuth } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Trips
 *   description: Trip scheduling, searching, filtering, and trip lifecycle management
 */

/**
 * @swagger
 * /trips:
 *   get:
 *     summary: Search trips by route, travel date, bus type, and price range
 *     tags: [Trips]
 *     parameters:
 *       - in: query
 *         name: sourceCity
 *         schema:
 *           type: string
 *       - in: query
 *         name: destinationCity
 *         schema:
 *           type: string
 *       - in: query
 *         name: departureDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/', optionalAuth, searchTrips);

/**
 * @swagger
 * /trips/{id}:
 *   get:
 *     summary: Get trip details by ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip details
 *       404:
 *         description: Trip not found
 */
router.get('/:id', optionalAuth, getTripById);

// Protected routes below
router.use(protect);

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Schedule a new trip and generate its seat inventory (Admin/Operator)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Trip scheduled
 */
router.post('/', restrictTo('admin', 'operator'), createTrip);

/**
 * @swagger
 * /trips/{id}/status:
 *   patch:
 *     summary: Update trip status transition (Admin/Operator)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trip status updated
 */
router.patch('/:id/status', restrictTo('admin', 'operator'), updateTripStatus);

/**
 * @swagger
 * /trips/{id}:
 *   delete:
 *     summary: Cancel a trip and release seats (Admin/Operator)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trip cancelled
 */
router.delete('/:id', restrictTo('admin', 'operator'), cancelTrip);

module.exports = router;
