const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'campus-erp-super-secret-key-2026';
const SECRETS = [
  process.env.JWT_SECRET,
  'campus-erp-super-secret-key-2026',
  'mern-campus-erp-super-secret-key-2026'
].filter(Boolean);

// Middleware to authenticate JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  let decoded = null;
  for (const secret of SECRETS) {
    try {
      decoded = jwt.verify(token, secret);
      if (decoded) break;
    } catch (err) {}
  }

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = decoded.id || decoded.userId;
  let user = db.prepare('SELECT id, username, full_name, email, role, department_id, avatar_url FROM users WHERE id = ? AND is_active = 1').get(userId);
  
  if (!user && decoded.username) {
    user = db.prepare('SELECT id, username, full_name, email, role, department_id, avatar_url FROM users WHERE username = ? AND is_active = 1').get(decoded.username);
  }

  // Multi-Tenant fallback to Document Store users collection
  if (!user) {
    const { getCollection } = require('../config/database');
    const docUsers = getCollection('users');
    const docUser = docUsers.docs.find(d => (d._id === userId || d.username === decoded.username) && d.isActive !== false);
    if (docUser) {
      user = {
        id: docUser._id,
        _id: docUser._id,
        username: docUser.username,
        full_name: docUser.fullName || docUser.username,
        email: docUser.email,
        role: docUser.role,
        department_id: docUser.departmentId || null,
        tenantId: docUser.tenantId || null
      };
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'User not found or account deactivated' });
  }

  if (decoded.tenantId) {
    user.tenantId = decoded.tenantId;
    req.tenantId = decoded.tenantId;
  }

  req.user = user;
  next();
};

// Middleware to authorize specific roles
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' is not authorized to perform this action.` 
      });
    }

    next();
  };
};

// Helper to record system audit logs
const logAudit = (userId, userRole, action, entityType, entityId, details, req) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_role, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userRole,
      action,
      entityType,
      entityId || 'N/A',
      typeof details === 'object' ? JSON.stringify(details) : details,
      ip
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = {
  JWT_SECRET,
  authenticate,
  authorize,
  logAudit
};
