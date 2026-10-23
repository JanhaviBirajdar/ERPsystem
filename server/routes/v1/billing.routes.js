const express = require('express');
const router = express.Router();
const billingService = require('../../services/billingService');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { getCollection } = require('../../config/database');
const { SUBSCRIPTION_PLANS } = require('../../config/subscriptionPlans');

// GET /api/v1/billing/plans - List subscription plans and tiers
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: {
      plans: billingService.getAvailablePlans()
    }
  });
});

// GET /api/v1/billing/status - Current tenant subscription status & usage limits
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { message: 'Tenant context required.' } });
    }

    const institutions = getCollection('institutions');
    const institution = await institutions.findById(tenantId);
    if (!institution) {
      return res.status(404).json({ success: false, error: { message: 'Institution not found.' } });
    }

    const sub = institution.subscription || { plan: 'STARTER', status: 'ACTIVE' };
    const planConfig = SUBSCRIPTION_PLANS[sub.plan] || SUBSCRIPTION_PLANS.STARTER;

    // Calculate current usage
    const users = getCollection('users');
    const studentCount = await users.countDocuments({ tenantId, role: 'STUDENT', isActive: true });
    const facultyCount = await users.countDocuments({ tenantId, role: 'FACULTY', isActive: true });

    res.json({
      success: true,
      data: {
        subscription: sub,
        plan: planConfig,
        usage: {
          students: { current: studentCount, max: planConfig.maxStudents, pct: Math.round((studentCount / planConfig.maxStudents) * 100) },
          faculty: { current: facultyCount, max: planConfig.maxFaculty, pct: Math.round((facultyCount / planConfig.maxFaculty) * 100) },
          storageGB: { current: 1.2, max: planConfig.storageLimitGB }
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/billing/checkout - Initiate checkout for plan upgrade
router.post('/checkout', authenticate, authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL']), async (req, res, next) => {
  try {
    const { planId, billingCycle } = req.body;
    const tenantId = req.tenantId || req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: { message: 'Tenant context required for billing checkout.' } });
    }

    const session = await billingService.createCheckoutSession({
      tenantId,
      planId,
      billingCycle,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Checkout session created successfully.',
      data: session
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/billing/webhook - Payment provider webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'] || req.headers['x-provider-signature'] || req.headers['x-billing-signature'];
    const payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(req.body.toString('utf-8'));

    const result = await billingService.handleProviderWebhook({
      eventType: req.headers['x-event-type'] || 'checkout.session.completed',
      payload,
      signature,
      rawBody: Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : JSON.stringify(req.body)
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: 'PAYMENT_VERIFICATION_FAILED',
        message: err.message
      }
    });
  }
});

// GET /api/v1/billing/invoices - Invoice ledger strictly isolated by tenant
router.get('/invoices', authenticate, authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'ACCOUNTANT']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const invoices = await billingService.getTenantInvoices(tenantId);

    res.json({
      success: true,
      data: {
        count: invoices.length,
        invoices
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
