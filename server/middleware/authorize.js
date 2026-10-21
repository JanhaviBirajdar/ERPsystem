/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Enforces server-side permissions for the 11 ERP roles
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User must be authenticated before role authorization.'
        }
      });
    }

    // SaaS Super Admin has access across administrative endpoints
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE_ACCESS',
          message: `Permission denied: Role '${req.user.role}' is not authorized to perform this operation. Required: [${allowedRoles.join(', ')}]`
        }
      });
    }

    next();
  };
};

module.exports = {
  authorize
};
