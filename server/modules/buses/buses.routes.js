const express = require('express');
const router = express.Router();
const {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
} = require('./buses.controller');
const { protect, restrictTo, optionalAuth } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Buses
 *   description: Fleet vehicles, seat layout configurations, and amenities
 */

/**
 * @swagger
 * /buses:
 *   get:
 *     summary: Get buses list with optional type, status, and search filters
 *     tags: [Buses]
 *     parameters:
 *       - in: query
 *         name: busType
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of fleet buses
 */
router.get('/', optionalAuth, getAllBuses);

/**
 * @swagger
 * /buses/{id}:
 *   get:
 *     summary: Get single bus details including seat layout template
 *     tags: [Buses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bus details
 *       404:
 *         description: Bus not found
 */
router.get('/:id', optionalAuth, getBusById);

// Protected routes below
router.use(protect);
router.use(restrictTo('admin', 'operator'));

/**
 * @swagger
 * /buses:
 *   post:
 *     summary: Register a new bus and generate seat layout (Admin/Operator)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Bus registered
 */
router.post('/', createBus);

/**
 * @swagger
 * /buses/{id}:
 *   patch:
 *     summary: Update bus details, layout, or amenities (Admin/Operator)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bus updated
 */
router.patch('/:id', updateBus);

/**
 * @swagger
 * /buses/{id}:
 *   delete:
 *     summary: Deactivate a bus (Admin/Operator)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bus deactivated
 */
router.delete('/:id', deleteBus);

module.exports = router;
