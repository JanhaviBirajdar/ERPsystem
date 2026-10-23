/**
 * Multi-Tenant SaaS Subscription Plans & Feature Entitlement Matrix
 * Commercial Tier Specifications for College ERP
 */

const SUBSCRIPTION_PLANS = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter Edition',
    description: 'Essential core operations for small polytechnics, standalone colleges, and junior institutes.',
    annualPriceINR: 24999,
    annualPriceUSD: 299,
    maxStudents: 500,
    maxFaculty: 50,
    storageLimitGB: 5,
    monthlyAiQueries: 0,
    entitlements: [
      'STUDENT_INFORMATION_SYSTEM',
      'ATTENDANCE_MANAGEMENT',
      'FEE_COLLECTION',
      'ACADEMIC_SYLLABUS',
      'BASIC_NOTICES',
      'SERVICE_DESK'
    ]
  },
  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    name: 'Professional Edition',
    description: 'Full-featured campus management with workflow automation for accredited universities & colleges.',
    annualPriceINR: 59999,
    annualPriceUSD: 749,
    maxStudents: 2500,
    maxFaculty: 250,
    storageLimitGB: 25,
    monthlyAiQueries: 1000,
    entitlements: [
      'STUDENT_INFORMATION_SYSTEM',
      'ATTENDANCE_MANAGEMENT',
      'FEE_COLLECTION',
      'ACADEMIC_SYLLABUS',
      'BASIC_NOTICES',
      'SERVICE_DESK',
      'EXAMINATION_MANAGEMENT',
      'PLACEMENT_PORTAL',
      'WORKFLOW_AUTOMATION',
      'SMART_TIMETABLE',
      'EARLY_WARNING_ALERTS'
    ]
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise Flagship Edition',
    description: 'Autonomous multi-campus platform with AI Campus Copilot, advanced analytics, and custom integrations.',
    annualPriceINR: 119999,
    annualPriceUSD: 1499,
    maxStudents: 25000,
    maxFaculty: 2000,
    storageLimitGB: 250,
    monthlyAiQueries: 25000,
    entitlements: [
      'ALL',
      'STUDENT_INFORMATION_SYSTEM',
      'ATTENDANCE_MANAGEMENT',
      'FEE_COLLECTION',
      'ACADEMIC_SYLLABUS',
      'BASIC_NOTICES',
      'SERVICE_DESK',
      'EXAMINATION_MANAGEMENT',
      'PLACEMENT_PORTAL',
      'WORKFLOW_AUTOMATION',
      'SMART_TIMETABLE',
      'EARLY_WARNING_ALERTS',
      'AI_CAMPUS_COPILOT',
      'ADVANCED_ANALYTICS',
      'NAAC_NBA_ACCREDITATION',
      'CAMPUS_OPERATIONS',
      'CUSTOM_BRANDING',
      'PRIORITY_SLA_SUPPORT'
    ]
  }
};

const SUBSCRIPTION_STATUSES = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED'
};

/**
 * Checks if a plan possesses a required feature entitlement
 */
function hasEntitlement(planId, featureKey) {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) return false;
  if (plan.entitlements.includes('ALL')) return true;
  return plan.entitlements.includes(featureKey);
}

module.exports = {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  hasEntitlement
};
