/**
 * Production Environment Configuration & Secret Validator
 * Enforces security posture before server starts listening.
 */

const INSECURE_DEFAULT_SECRETS = [
  'your_jwt_secret_change_in_production',
  'supersecretkey123',
  'default_secret',
  'secret'
];

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const warnings = [];
  const errors = [];

  const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_college_erp_2026';
  if (INSECURE_DEFAULT_SECRETS.includes(jwtSecret)) {
    if (isProd) {
      errors.push('JWT_SECRET uses an insecure default value. Production deployment aborted.');
    } else {
      warnings.push('JWT_SECRET is using a non-production development default.');
    }
  }

  if (isProd && (!process.env.BILLING_WEBHOOK_SECRET || process.env.BILLING_WEBHOOK_SECRET.startsWith('dev_'))) {
    warnings.push('BILLING_WEBHOOK_SECRET is not set to a production cryptographically secure key.');
  }

  if (errors.length > 0) {
    console.error('❌ CRITICAL ENVIRONMENT CONFIGURATION ERRORS:');
    errors.forEach(e => console.error(`   - ${e}`));
    throw new Error('Server boot aborted due to environment security violations.');
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Environment Configuration Notices:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  return {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasStripeKeys: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    isProductionCompliant: errors.length === 0
  };
}

module.exports = { validateEnvironment };
