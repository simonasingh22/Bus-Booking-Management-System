const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditLogById } = require('./auditLogs.controller');
const { protect, restrictTo } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: Immutable audit trails for compliance, security, and material business changes
 */

router.use(protect);

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Query security and business audit logs
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/', restrictTo('admin', 'operator'), getAuditLogs);

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Get single audit log detail
 *     tags: [AuditLogs]
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
 *         description: Audit log detail
 */
router.get('/:id', restrictTo('admin'), getAuditLogById);

module.exports = router;
