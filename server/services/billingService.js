const crypto = require('crypto');
const { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } = require('../config/subscriptionPlans');
const { getCollection, createObjectId } = require('../config/database');

const SIGNING_SECRET = process.env.BILLING_WEBHOOK_SECRET || 'dev_billing_signing_secret_9823471092';

class BillingService {
  /**
   * Return catalog of subscription tiers and entitlements
   */
  getAvailablePlans() {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Initialize a checkout session for plan upgrade or renewal
   */
  async createCheckoutSession({ tenantId, planId, billingCycle = 'ANNUAL', successUrl, cancelUrl, user }) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      const err = new Error(`Invalid plan selection: ${planId}`);
      err.statusCode = 400;
      throw err;
    }

    const institutions = getCollection('institutions');
    const institution = await institutions.findById(tenantId);
    if (!institution) {
      const err = new Error('Institution not found');
      err.statusCode = 404;
      throw err;
    }

    const sessionId = `cs_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const amount = plan.annualPriceINR;

    // Cryptographic signature binding tenantId, planId, amount, and timestamp
    const signaturePayload = `${sessionId}:${tenantId}:${planId}:${amount}:${billingCycle}`;
    const sessionSignature = crypto.createHmac('sha256', SIGNING_SECRET).update(signaturePayload).digest('hex');

    const isLiveConfigured = !!(process.env.STRIPE_SECRET_KEY || process.env.RAZORPAY_KEY_ID);

    return {
      sessionId,
      provider: isLiveConfigured ? 'STRIPE_LIVE' : 'SIMULATION_SANDBOX',
      isLiveConfigured,
      amount,
      currency: 'INR',
      planId: plan.id,
      planName: plan.name,
      tenantId,
      institutionName: institution.name,
      sessionSignature,
      checkoutUrl: isLiveConfigured 
        ? `https://checkout.stripe.com/pay/${sessionId}`
        : `/billing/sandbox-checkout?session_id=${sessionId}&sig=${sessionSignature}&tenant_id=${tenantId}&plan_id=${planId}&amount=${amount}`
    };
  }

  /**
   * Process and verify payment provider webhook notification
   * Strictly enforces cryptographic signature verification: Zero trust on unverified claims.
   */
  async handleProviderWebhook({ eventType, payload, signature, rawBody }) {
    if (!signature) {
      const err = new Error('Security Alert: Missing provider cryptographic signature.');
      err.statusCode = 401;
      throw err;
    }

    let isVerified = false;
    let eventData = null;

    // 1. Live Stripe Webhook Check (if live secret is configured)
    if (process.env.STRIPE_WEBHOOK_SECRET && rawBody) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
        isVerified = true;
        eventData = event.data.object;
      } catch (stripeErr) {
        const err = new Error(`Stripe signature verification failed: ${stripeErr.message}`);
        err.statusCode = 400;
        throw err;
      }
    } 
    // 2. Verified Sandbox / Test HMAC Verification
    else {
      const { sessionId, tenantId, planId, amount, billingCycle } = payload || {};
      const expectedPayload = `${sessionId}:${tenantId}:${planId}:${amount}:${billingCycle}`;
      const expectedSignature = crypto.createHmac('sha256', SIGNING_SECRET).update(expectedPayload).digest('hex');

      if (crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        isVerified = true;
        eventData = {
          id: sessionId,
          tenantId,
          planId,
          amount,
          billingCycle,
          provider: 'VERIFIED_SANDBOX_GATEWAY',
          status: 'PAID'
        };
      } else {
        const err = new Error('Cryptographic signature mismatch. Untrusted payment notification rejected.');
        err.statusCode = 400;
        throw err;
      }
    }

    if (!isVerified || !eventData) {
      const err = new Error('Payment could not be verified by authorized provider.');
      err.statusCode = 400;
      throw err;
    }

    // Process subscription status transition upon verified confirmation
    const institutions = getCollection('institutions');
    const institution = await institutions.findById(eventData.tenantId);
    if (!institution) {
      const err = new Error(`Institution not found for tenant ${eventData.tenantId}`);
      err.statusCode = 404;
      throw err;
    }

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1); // 1-year annual cycle

    const updatedSubscription = {
      plan: eventData.planId,
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      provider: eventData.provider || 'STRIPE',
      transactionId: eventData.id,
      amountPaid: Number(eventData.amount),
      currency: 'INR',
      activatedAt: new Date(),
      currentPeriodEnd,
      lastVerifiedAt: new Date()
    };

    await institutions.updateOne(
      { _id: eventData.tenantId },
      { $set: { subscription: updatedSubscription } }
    );

    // Record Immutable Invoice in Document Store
    const invoices = getCollection('tenant_invoices');
    const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const invoiceRecord = {
      _id: createObjectId(),
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: eventData.tenantId,
      institutionName: institution.name,
      planId: eventData.planId,
      amount: Number(eventData.amount),
      currency: 'INR',
      status: 'PAID',
      provider: eventData.provider,
      transactionId: eventData.id,
      periodStart: new Date(),
      periodEnd: currentPeriodEnd,
      pdfReceiptUrl: `/api/v1/billing/invoices/${invoiceId}.pdf`,
      createdAt: new Date()
    };
    await invoices.insertOne(invoiceRecord);

    return {
      success: true,
      message: `Subscription for ${institution.name} upgraded to ${eventData.planId} (Verified by ${eventData.provider})`,
      tenantId: eventData.tenantId,
      subscription: updatedSubscription,
      invoice: invoiceRecord
    };
  }

  /**
   * Retrieve billing invoice ledger strictly scoped to the requesting tenant
   */
  async getTenantInvoices(tenantId) {
    const invoices = getCollection('tenant_invoices');
    return invoices.find({ tenantId }, { sort: { createdAt: -1 } });
  }
}

module.exports = new BillingService();
