const { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES, hasEntitlement } = require('../config/subscriptionPlans');
const { getCollection } = require('../config/database');

/**
 * Server-side Subscription Entitlement Middleware
 * Strict commercial enforcement: Never rely on frontend UI hiding.
 */
const requireEntitlement = (featureKey) => {
  return async (req, res, next) => {
    try {
      // 1. SaaS Platform Super Admin bypasses tier limits for cross-tenant maintenance
      if (req.user && req.user.role === 'SUPER_ADMIN' && !req.headers['x-tenant-id']) {
        return next();
      }

      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        // In standalone/demo mode without explicit tenant context, default to ENTERPRISE for zero disruption
        return next();
      }

      const institutions = getCollection('institutions');
      const institution = await institutions.findById(tenantId);

      if (!institution) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Active institution profile could not be located.'
          }
        });
      }

      const sub = institution.subscription || { plan: 'STARTER', status: 'ACTIVE' };
      const planId = sub.plan || 'STARTER';
      const status = sub.status || 'ACTIVE';

      // 2. Check Subscription Status
      if (status === SUBSCRIPTION_STATUSES.SUSPENDED || status === SUBSCRIPTION_STATUSES.CANCELLED) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_SUSPENDED',
            message: `Institution subscription is currently ${status}. Please contact billing or renew your plan to restore access.`,
            status,
            upgradeUrl: '/billing/portal'
          }
        });
      }

      if (status === SUBSCRIPTION_STATUSES.PAST_DUE && ['AI_CAMPUS_COPILOT', 'ADVANCED_ANALYTICS'].includes(featureKey)) {
        return res.status(402).json({
          success: false,
          error: {
            code: 'PAYMENT_REQUIRED',
            message: 'Subscription payment is past due. High-compute services are temporarily restricted until invoice settlement.',
            upgradeUrl: '/billing/invoices'
          }
        });
      }

      // 3. Verify Plan Entitlement
      const isEntitled = hasEntitlement(planId, featureKey);
      if (!isEntitled) {
        const currentPlanConfig = SUBSCRIPTION_PLANS[planId];
        return res.status(403).json({
          success: false,
          error: {
            code: 'FEATURE_NOT_ENTITLED',
            message: `Access Denied: The requested capability (${featureKey}) is not included in your ${currentPlanConfig ? currentPlanConfig.name : planId} plan.`,
            requiredFeature: featureKey,
            currentPlan: planId,
            minimumRequiredPlan: featureKey === 'AI_CAMPUS_COPILOT' || featureKey === 'ADVANCED_ANALYTICS' ? 'ENTERPRISE' : 'PROFESSIONAL',
            upgradeUrl: '/billing/upgrade'
          }
        });
      }

      req.institutionSubscription = sub;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Enforces numerical usage limits (e.g. Student Capacity, AI Quota)
 */
const requireUsageWithinLimit = (metricType) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) return next();

      const institutions = getCollection('institutions');
      const institution = await institutions.findById(tenantId);
      if (!institution) return next();

      const sub = institution.subscription || { plan: 'STARTER', status: 'ACTIVE' };
      const plan = SUBSCRIPTION_PLANS[sub.plan] || SUBSCRIPTION_PLANS.STARTER;

      if (metricType === 'STUDENT_CAPACITY') {
        const users = getCollection('users');
        const currentStudentCount = await users.countDocuments({ tenantId, role: 'STUDENT', isActive: true });
        if (currentStudentCount >= plan.maxStudents) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'STUDENT_LIMIT_EXCEEDED',
              message: `Student enrollment limit exceeded. Your ${plan.name} allows up to ${plan.maxStudents} students (Current: ${currentStudentCount}). Please upgrade to enroll more students.`,
              currentCount: currentStudentCount,
              limit: plan.maxStudents,
              upgradeUrl: '/billing/upgrade'
            }
          });
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  requireEntitlement,
  requireUsageWithinLimit
};
