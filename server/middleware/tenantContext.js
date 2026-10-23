const { getCollection } = require('../config/database');

/**
 * Tenant Context Resolution & Security Middleware
 * Prevents unauthorized client-supplied tenant tampering and strictly bounds data access.
 */
const resolveTenant = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');

    let resolvedTenantId = null;

    // 1. Authoritative check: If user is already authenticated via JWT
    if (req.user && req.user.tenantId) {
      resolvedTenantId = req.user.tenantId;

      // Security check: Client header must NOT contradict user's assigned tenant
      const headerTenantId = req.headers['x-tenant-id'] || req.headers['x-tenant-code'];
      if (headerTenantId && req.user.role !== 'SUPER_ADMIN') {
        const matchingInst = await institutions.findOne({
          $or: [{ _id: headerTenantId }, { tenantCode: headerTenantId?.toUpperCase() }]
        });
        if (matchingInst && matchingInst._id !== req.user.tenantId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'CROSS_TENANT_ACCESS_DENIED',
              message: 'Security Alert: You are not authorized to access records belonging to another institution.'
            }
          });
        }
      } else if (req.user.role === 'SUPER_ADMIN' && headerTenantId) {
        const matchingInst = await institutions.findOne({
          $or: [{ _id: headerTenantId }, { tenantCode: headerTenantId?.toUpperCase() }]
        });
        if (matchingInst) resolvedTenantId = matchingInst._id;
      }
    } 
    // 2. Unauthenticated endpoint (e.g. login, onboarding, public verify) or SaaS Super Admin
    else {
      // Subdomain check (e.g. "ait.campuserp.io")
      const host = req.headers.host || '';
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        const sub = parts[0].toLowerCase();
        const inst = await institutions.findOne({ subdomain: sub });
        if (inst) resolvedTenantId = inst._id;
      }

      // Header fallback
      if (!resolvedTenantId) {
        const headerId = req.headers['x-tenant-id'] || req.headers['x-tenant-code'];
        if (headerId) {
          const inst = await institutions.findOne({
            $or: [{ _id: headerId }, { tenantCode: headerId.toUpperCase() }]
          });
          if (inst) resolvedTenantId = inst._id;
        }
      }
    }

    if (resolvedTenantId) {
      const tenantDoc = await institutions.findById(resolvedTenantId);
      req.tenantId = resolvedTenantId;
      req.tenant = tenantDoc;
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Ensures that an authorized tenant exists on the request.
 * Fails with 400 or 403 if missing.
 */
const requireTenant = (req, res, next) => {
  if (req.user && req.user.role === 'SUPER_ADMIN' && !req.headers['x-tenant-id']) {
    return next(); // SaaS Super Admin has cross-tenant oversight when no specific tenant is targeted
  }

  if (!req.tenantId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Institution context missing. Provide a valid tenant code or access via college subdomain.'
      }
    });
  }

  next();
};

/**
 * Helper to enforce tenantId into any database query
 */
const scopeQuery = (query = {}, req) => {
  if (req.user && req.user.role === 'SUPER_ADMIN' && !req.headers['x-tenant-id']) {
    return query; // Super admin querying across platform
  }
  return {
    ...query,
    tenantId: req.tenantId
  };
};

module.exports = {
  resolveTenant,
  requireTenant,
  scopeQuery
};
