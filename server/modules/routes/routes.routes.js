const express = require('express');
const router = express.Router();
const {
  getAllRoutes,
  getDistinctCities,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
} = require('./routes.controller');
const { protect, restrictTo, optionalAuth } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Routes
 *   description: Transit corridors, distances, intermediate stops, and boarding/dropping points
 */

/**
 * @swagger
 * /routes/cities:
 *   get:
 *     summary: Get unique list of origin and destination cities
 *     tags: [Routes]
 *     responses:
 *       200:
 *         description: List of source and destination cities
 */
router.get('/cities', getDistinctCities);

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: List routes with search and city filter
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: sourceCity
 *         schema:
 *           type: string
 *       - in: query
 *         name: destinationCity
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of routes
 */
router.get('/', optionalAuth, getAllRoutes);

/**
 * @swagger
 * /routes/{id}:
 *   get:
 *     summary: Get route details by ID with intermediate stops
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Route details
 *       404:
 *         description: Route not found
 */
router.get('/:id', optionalAuth, getRouteById);

// Protected routes below
router.use(protect);

/**
 * @swagger
 * /routes:
 *   post:
 *     summary: Create new transit route (Admin/Operator)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Route created
 */
router.post('/', restrictTo('admin', 'operator'), createRoute);

/**
 * @swagger
 * /routes/{id}:
 *   patch:
 *     summary: Update route details or stops (Admin/Operator)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Route updated
 */
router.patch('/:id', restrictTo('admin', 'operator'), updateRoute);

/**
 * @swagger
 * /routes/{id}:
 *   delete:
 *     summary: Deactivate a route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Route deactivated
 */
router.delete('/:id', restrictTo('admin'), deleteRoute);

module.exports = router;
