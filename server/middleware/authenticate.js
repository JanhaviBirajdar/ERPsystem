const jwt = require('jsonwebtoken');
const { getCollection } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mern-campus-erp-super-secret-key-2026';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Access denied. Valid Bearer token required in Authorization header.'
      }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = getCollection('users');
    const user = await users.findOne({ _id: decoded.userId, isActive: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_USER_SESSION',
          message: 'User account not found or deactivated.'
        }
      });
    }

    req.user = {
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tenantId: user.tenantId,
      departmentId: user.departmentId || null
    };

    // Set tenant context from user's verified token
    if (user.tenantId) {
      req.tenantId = user.tenantId;
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Session token has expired or is invalid. Please log in again.'
      }
    });
  }
};

module.exports = {
  JWT_SECRET,
  authenticate
};
