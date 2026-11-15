const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getTripManifest,
  getOccupancySummary,
} = require('./reports.controller');
const { protect, restrictTo } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Operational reports, passenger manifests, seat occupancy, and revenue analytics
 */

router.use(protect);
router.use(restrictTo('admin', 'operator'));

/**
 * @swagger
 * /reports/dashboard-stats:
 *   get:
 *     summary: Get high-level KPI metrics (revenue, bookings, fleet, occupancy)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard-stats', getDashboardStats);

/**
 * @swagger
 * /reports/trip-manifest/{tripId}:
 *   get:
 *     summary: Generate verified passenger manifest for a trip reconciled with confirmed tickets
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Passenger manifest with seating assignments
 */
router.get('/trip-manifest/:tripId', getTripManifest);

/**
 * @swagger
 * /reports/occupancy-summary:
 *   get:
 *     summary: Get occupancy rate and revenue reconciliation report across trips
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Occupancy report summary
 */
router.get('/occupancy-summary', getOccupancySummary);

module.exports = router;
