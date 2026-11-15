const express = require('express');
const router = express.Router();
const {
  getAllOperators,
  getOperatorById,
  createOperator,
  updateOperator,
  deleteOperator,
} = require('./operators.controller');
const { protect, restrictTo, optionalAuth } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Operators
 *   description: Bus operator companies and fleet administration
 */

/**
 * @swagger
 * /operators:
 *   get:
 *     summary: Get all active bus operators
 *     tags: [Operators]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of operators
 */
router.get('/', optionalAuth, getAllOperators);

/**
 * @swagger
 * /operators/{id}:
 *   get:
 *     summary: Get operator details and active bus count
 *     tags: [Operators]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Operator details
 *       404:
 *         description: Operator not found
 */
router.get('/:id', getOperatorById);

// Protected routes below
router.use(protect);

/**
 * @swagger
 * /operators:
 *   post:
 *     summary: Register a new operator (Admin only)
 *     tags: [Operators]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Operator registered
 */
router.post('/', restrictTo('admin'), createOperator);

/**
 * @swagger
 * /operators/{id}:
 *   patch:
 *     summary: Update operator details (Admin or Owner Operator)
 *     tags: [Operators]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operator updated
 */
router.patch('/:id', restrictTo('admin', 'operator'), updateOperator);

/**
 * @swagger
 * /operators/{id}:
 *   delete:
 *     summary: Deactivate an operator (Admin only)
 *     tags: [Operators]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operator deactivated
 */
router.delete('/:id', restrictTo('admin'), deleteOperator);

module.exports = router;
