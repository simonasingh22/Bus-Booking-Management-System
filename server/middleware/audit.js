const AuditLog = require('../modules/auditLogs/AuditLog.model');

/**
 * Record an audit log entry in MongoDB
 * Non-blocking: logs any error silently without halting user transactions
 */
const logAuditAction = async ({
  req,
  action,
  entityType,
  entityId = null,
  details = {},
  userId = null,
  userName = 'System',
  userRole = 'system',
}) => {
  try {
    const user = req?.user;
    await AuditLog.create({
      userId: userId || (user ? user._id : null),
      userName: user ? user.name : userName,
      userRole: user ? user.role : userRole,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      details,
      ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip) : null,
      userAgent: req ? req.headers['user-agent'] : null,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('AuditLog writing failed:', err.message);
  }
};

module.exports = { logAuditAction };
