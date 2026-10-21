const { getCollection } = require('../config/database');
const { scopeQuery } = require('../middleware/tenantContext');

const getAuditLogs = async (req, res, next) => {
  try {
    const col = getCollection('audit_logs');
    const filter = scopeQuery({}, req);
    const limit = parseInt(req.query.limit) || 50;

    const logs = await col.find(filter, { sort: { timestamp: -1 }, limit });
    res.json({ success: true, data: { count: logs.length, logs } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs
};
