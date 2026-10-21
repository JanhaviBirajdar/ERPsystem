const { getCollection, createObjectId } = require('../config/database');

/**
 * Asynchronous Security Audit Logger
 * Records tamper-evident audit logs with tenantId, userId, role, action, and IP.
 */
const recordAuditLog = async (tenantId, userId, userRole, action, entityType, entityId, details, req) => {
  try {
    const auditLogs = getCollection('audit_logs');
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';

    await auditLogs.insertOne({
      _id: createObjectId(),
      tenantId: tenantId || null,
      userId: userId || null,
      userRole: userRole || 'ANONYMOUS',
      action,
      entityType,
      entityId: entityId || 'N/A',
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress: ip,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Audit log write error:', err.message);
  }
};

module.exports = {
  recordAuditLog
};
