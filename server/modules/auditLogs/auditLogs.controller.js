const AuditLog = require('./AuditLog.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');

/**
 * @desc    Get audit trail logs with filtering and pagination
 * @route   GET /api/audit-logs
 * @access  Private (Admin or Operator)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.user.role === 'operator') {
    query.userId = req.user._id;
  } else if (req.query.userId) {
    query.userId = req.query.userId;
  }

  if (req.query.action) {
    query.action = req.query.action;
  }

  if (req.query.entityType) {
    query.entityType = req.query.entityType;
  }

  if (req.query.entityId) {
    query.entityId = req.query.entityId;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Audit logs retrieved successfully.', {
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single audit log entry by ID
 * @route   GET /api/audit-logs/:id
 * @access  Private (Admin)
 */
const getAuditLogById = asyncHandler(async (req, res, next) => {
  const log = await AuditLog.findById(req.params.id);
  if (!log) {
    return next(new AppError('Audit log entry not found.', 404));
  }

  sendSuccess(res, 200, 'Audit log details retrieved.', { log });
});

module.exports = {
  getAuditLogs,
  getAuditLogById,
};
