const assert = require('assert');
const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:5000';

async function runMultiTenantSaaSTests() {
  console.log('🧪 Starting Commercial Multi-Tenant SaaS Verification Suite...\n');

  try {
    // -------------------------------------------------------------------------
    // Test 1: Healthcheck, Readiness & Deep Diagnostic Probes
    // -------------------------------------------------------------------------
    console.log('Test S1: Application Health, Readiness & Deep Diagnostics');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'HEALTHY');

    const readyRes = await fetch(`${BASE_URL}/api/health/ready`);
    assert.strictEqual(readyRes.status, 200);
    const readyData = await readyRes.json();
    assert.strictEqual(readyData.ready, true);
    assert.strictEqual(readyData.database, 'CONNECTED');

    const deepRes = await fetch(`${BASE_URL}/api/health/deep`);
    assert.strictEqual(deepRes.status, 200);
    const deepData = await deepRes.json();
    assert.strictEqual(deepData.status, 'HEALTHY');
    assert.strictEqual(deepData.diagnostics.sqlite.integrity, 'PASSED_OK');
    assert.ok(deepData.diagnostics.sqlite.records.students > 0);
    assert.ok(deepData.diagnostics.memory.heapUsedMB > 0);
    console.log(`  ✅ Probes verified: Health=OK, Readiness=OK, SQLite Integrity=${deepData.diagnostics.sqlite.integrity} (${deepData.diagnostics.latencyMs}ms)\n`);

    // -------------------------------------------------------------------------
    // Test 2: College Onboarding & Custom Branding / Academic Settings
    // -------------------------------------------------------------------------
    console.log('Test S2: Multi-Tenant College Onboarding & Institution Configuration');
    const uniqueSuffix = Date.now().toString().slice(-4);
    const onboardingPayload = {
      name: `Vidya Tech Institute ${uniqueSuffix}`,
      tenantCode: `VTI${uniqueSuffix}`,
      subdomain: `vti${uniqueSuffix}`,
      affiliation: 'Autonomous National Technical University',
      naacGrade: 'A+',
      aicteApprovalNo: `AICTE/VTI/${uniqueSuffix}`,
      contactEmail: `admin@vti${uniqueSuffix}.edu.in`,
      contactPhone: '+91 20 4455 6677',
      adminUsername: `admin_vti_${uniqueSuffix}`,
      adminPassword: 'SecurePassword123!',
      adminFullName: 'Dr. Ramesh Deshmukh',
      adminEmail: `r.deshmukh@vti${uniqueSuffix}.edu.in`
    };

    const onboardRes = await fetch(`${BASE_URL}/api/v1/auth/onboard-college`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onboardingPayload)
    });
    assert.strictEqual(onboardRes.status, 201);
    const onboardData = await onboardRes.json();
    assert.strictEqual(onboardData.success, true);
    const newTenantId = onboardData.data.institution.id;
    console.log(`  ✅ College Onboarded: ${onboardingPayload.name} (Tenant: ${onboardingPayload.tenantCode}, ID: ${newTenantId})`);

    // Authenticate the new college admin
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: onboardingPayload.adminUsername,
        password: onboardingPayload.adminPassword
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    const vtiToken = loginData.data.token;

    // Configure Institution Branding
    const brandingRes = await fetch(`${BASE_URL}/api/v1/institution/branding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({
        portalTitle: 'Vidya Technological Research Portal',
        tagline: 'Empowering Next-Gen Engineers',
        primaryColor: '#059669',
        secondaryColor: '#064e3b',
        logoUrl: '/assets/vti-crest.png'
      })
    });
    assert.strictEqual(brandingRes.status, 200);
    const brandingData = await brandingRes.json();
    assert.strictEqual(brandingData.data.branding.primaryColor, '#059669');

    // Configure Academic Settings
    const academicRes = await fetch(`${BASE_URL}/api/v1/institution/academic-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({
        attendanceStatutoryMinPct: 80.0,
        passingMarksPct: 45.0,
        gradingScale: '10_POINT_CGPA',
        termsPerYear: 2
      })
    });
    assert.strictEqual(academicRes.status, 200);
    const academicData = await academicRes.json();
    assert.strictEqual(academicData.data.settings.attendanceStatutoryMinPct, 80.0);
    console.log('  ✅ Institution branding and academic settings configured successfully\n');

    // -------------------------------------------------------------------------
    // Test 3: Cross-Tenant Data Isolation & Boundary Enforcement
    // -------------------------------------------------------------------------
    console.log('Test S3: Strict Cross-Tenant Data Isolation & Boundary Enforcement');
    // Authenticate College 1 (AIT Pune)
    const aitAuth = await (await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_ait', password: 'admin123' })
    })).json();
    const aitToken = aitAuth.data.token;
    const aitTenantId = aitAuth.data.user.tenantId;

    // Authenticate College 2 (PIME Pune)
    const pimeAuth = await (await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_pime', password: 'pime123' })
    })).json();
    const pimeToken = pimeAuth.data.token;
    const pimeTenantId = pimeAuth.data.user.tenantId;

    // AIT Admin attempts to impersonate or access PIME's data via x-tenant-id header
    const crossTenantTamperRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      headers: {
        Authorization: `Bearer ${aitToken}`,
        'x-tenant-id': pimeTenantId
      }
    });
    assert.strictEqual(crossTenantTamperRes.status, 403, 'Cross-tenant access attempt must be rejected with 403');
    const tamperData = await crossTenantTamperRes.json();
    assert.strictEqual(tamperData.error.code, 'CROSS_TENANT_ACCESS_DENIED');
    console.log('  ✅ Cross-tenant header tampering blocked: CROSS_TENANT_ACCESS_DENIED');

    // Verify legitimate isolation: PIME admin sees ONLY PIME departments (IT, MECH), never AIT's (COMP, AIDS)
    const pimeDeptsRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      headers: { Authorization: `Bearer ${pimeToken}` }
    });
    assert.strictEqual(pimeDeptsRes.status, 200);
    const pimeDeptsData = await pimeDeptsRes.json();
    const pimeCodes = pimeDeptsData.data.departments.map(d => d.code);
    assert.ok(pimeCodes.includes('IT') || pimeCodes.includes('MECH'));
    assert.ok(!pimeCodes.includes('AIDS'), 'AIT-specific department (AIDS) must NEVER appear in PIME records');
    console.log(`  ✅ Verified clean tenant data partitioning: PIME departments [${pimeCodes.join(', ')}] isolated from AIT\n`);

    // -------------------------------------------------------------------------
    // Test 4: Configurable Subscription Plans & Server-Side Entitlement Enforcement
    // -------------------------------------------------------------------------
    console.log('Test S4: Subscription Plans & Server-Side Feature Entitlement Enforcement');
    // Set VTI to STARTER plan via authenticated API
    await fetch(`${BASE_URL}/api/v1/institution`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({ subscription: { plan: 'STARTER', status: 'ACTIVE' } })
    });

    // STARTER plan does NOT have AI_CAMPUS_COPILOT entitlement
    const aiAttemptRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({ prompt: 'Show campus overview' })
    });
    assert.strictEqual(aiAttemptRes.status, 403, 'STARTER plan must be denied access to AI Campus Copilot');
    const aiAttemptData = await aiAttemptRes.json();
    assert.strictEqual(aiAttemptData.error.code, 'FEATURE_NOT_ENTITLED');
    assert.strictEqual(aiAttemptData.error.requiredFeature, 'AI_CAMPUS_COPILOT');
    console.log('  ✅ Server-side entitlement check enforced: STARTER plan blocked from AI Campus Copilot (403 FEATURE_NOT_ENTITLED)');

    // STARTER plan does NOT have ADVANCED_ANALYTICS entitlement
    const analyticsAttemptRes = await fetch(`${BASE_URL}/api/analytics/management-overview`, {
      headers: { Authorization: `Bearer ${vtiToken}` }
    });
    assert.strictEqual(analyticsAttemptRes.status, 403, 'STARTER plan must be denied access to Advanced Analytics');
    const analyticsAttemptData = await analyticsAttemptRes.json();
    assert.strictEqual(analyticsAttemptData.error.code, 'FEATURE_NOT_ENTITLED');
    console.log('  ✅ Server-side entitlement check enforced: STARTER plan blocked from Advanced Analytics');
    console.log('  ✅ Security verified: Frontend hiding is never relied upon\n');

    // -------------------------------------------------------------------------
    // Test 5: Subscription Status Handling (Suspended / Past Due)
    // -------------------------------------------------------------------------
    console.log('Test S5: Subscription Status Lifecycle Handling (Suspended Account)');
    await fetch(`${BASE_URL}/api/v1/institution`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({ subscription: { plan: 'ENTERPRISE', status: 'SUSPENDED' } })
    });

    const suspendedAttemptRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({ prompt: 'Show campus overview' })
    });
    assert.strictEqual(suspendedAttemptRes.status, 403);
    const suspendedData = await suspendedAttemptRes.json();
    assert.strictEqual(suspendedData.error.code, 'SUBSCRIPTION_SUSPENDED');
    console.log('  ✅ Suspended institution blocked from all services (SUBSCRIPTION_SUSPENDED)\n');

    // Restore to ACTIVE for further tests
    await fetch(`${BASE_URL}/api/v1/institution`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({ subscription: { plan: 'STARTER', status: 'ACTIVE' } })
    });

    // -------------------------------------------------------------------------
    // Test 6: Secure Billing Integration & Cryptographic Webhook Verification
    // -------------------------------------------------------------------------
    console.log('Test S6: Billing Integration & Cryptographic Provider Webhook Verification');
    // 1. Create checkout session
    const checkoutRes = await fetch(`${BASE_URL}/api/v1/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vtiToken}`
      },
      body: JSON.stringify({ planId: 'ENTERPRISE', billingCycle: 'ANNUAL' })
    });
    assert.strictEqual(checkoutRes.status, 200);
    const checkoutData = await checkoutRes.json();
    assert.strictEqual(checkoutData.success, true);
    assert.ok(checkoutData.data.sessionId);
    assert.ok(checkoutData.data.sessionSignature);
    const session = checkoutData.data;
    console.log(`  ✅ Checkout session initiated: Session=${session.sessionId}, Amount=₹${session.amount}`);

    // 2. Reject untrusted / forged webhook (invalid signature)
    const forgedWebhookRes = await fetch(`${BASE_URL}/api/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-provider-signature': 'forged_fake_signature_abc123'
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        tenantId: newTenantId,
        planId: 'ENTERPRISE',
        amount: session.amount,
        billingCycle: 'ANNUAL'
      })
    });
    assert.strictEqual(forgedWebhookRes.status, 400);
    const forgedData = await forgedWebhookRes.json();
    assert.strictEqual(forgedData.error.code, 'PAYMENT_VERIFICATION_FAILED');
    console.log('  ✅ Forged payment webhook rejected: Cryptographic signature mismatch');

    // 3. Process authentic cryptographically signed webhook
    const validWebhookRes = await fetch(`${BASE_URL}/api/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-provider-signature': session.sessionSignature
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        tenantId: newTenantId,
        planId: 'ENTERPRISE',
        amount: session.amount,
        billingCycle: 'ANNUAL'
      })
    });
    assert.strictEqual(validWebhookRes.status, 200);
    const validData = await validWebhookRes.json();
    assert.strictEqual(validData.success, true);
    assert.strictEqual(validData.subscription.plan, 'ENTERPRISE');
    assert.strictEqual(validData.subscription.status, 'ACTIVE');
    console.log('  ✅ Verified provider payment webhook confirmed: Subscription upgraded to ENTERPRISE');

    // 4. Retrieve tenant invoices (verify strict tenant isolation)
    const invoicesRes = await fetch(`${BASE_URL}/api/v1/billing/invoices`, {
      headers: { Authorization: `Bearer ${vtiToken}` }
    });
    assert.strictEqual(invoicesRes.status, 200);
    const invoicesData = await invoicesRes.json();
    assert.ok(invoicesData.data.count >= 1);
    assert.strictEqual(invoicesData.data.invoices[0].tenantId, newTenantId);
    console.log(`  ✅ Scoped invoice ledger verified: ${invoicesData.data.count} paid invoice(s) on file\n`);

    // -------------------------------------------------------------------------
    // Test 7: Database Backup Creation & Tested Recovery Procedure
    // -------------------------------------------------------------------------
    console.log('Test S7: Multi-Tenant Database Backup & Cryptographic Recovery Procedure');
    const saasAdminAuth = await (await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'saas_admin', password: 'superadmin123' })
    })).json();
    const saasAdminToken = saasAdminAuth.data.token;

    // Create Backup Snapshot
    const backupRes = await fetch(`${BASE_URL}/api/v1/backups/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saasAdminToken}` }
    });
    assert.strictEqual(backupRes.status, 201);
    const backupData = await backupRes.json();
    assert.strictEqual(backupData.success, true);
    assert.ok(backupData.data.snapshotId);
    assert.ok(backupData.data.integrity.sqliteHash);
    assert.ok(backupData.data.integrity.mongoHash);
    const snapshotId = backupData.data.snapshotId;
    console.log(`  ✅ Point-in-time backup created: Snapshot=${snapshotId}`);
    console.log(`     - SQLite SHA-256 : ${backupData.data.integrity.sqliteHash.slice(0, 24)}...`);
    console.log(`     - Mongo SHA-256  : ${backupData.data.integrity.mongoHash.slice(0, 24)}...`);

    // Restore from Backup Snapshot
    const restoreRes = await fetch(`${BASE_URL}/api/v1/backups/${snapshotId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saasAdminToken}` }
    });
    assert.strictEqual(restoreRes.status, 200);
    const restoreData = await restoreRes.json();
    assert.strictEqual(restoreData.success, true);
    assert.strictEqual(restoreData.data.integrityCheck, 'PASSED_OK');
    console.log(`  ✅ Disaster recovery verified: Database restored with 0 corruption (PRAGMA integrity_check: PASSED_OK)\n`);

    // -------------------------------------------------------------------------
    // Test 8: Security Headers & Rate Limiting Enforcement
    // -------------------------------------------------------------------------
    console.log('Test S8: Hardened Security Headers & API Rate Limiting');
    const secRes = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(secRes.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(secRes.headers.get('content-security-policy'));
    assert.ok(secRes.headers.get('x-trace-id'), 'Must attach distributed trace ID');
    assert.ok(secRes.headers.get('ratelimit-limit'), 'Must provide standard rate limiting header');
    console.log('  ✅ Security headers verified: CSP, nosniff, trace-id, and rate limiting active\n');

    console.log('🏆 ALL COMMERCIAL MULTI-TENANT SAAS CHECKS PASSED 100%!\n');
  } catch (err) {
    console.error('❌ Multi-Tenant SaaS Test Failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runMultiTenantSaaSTests();
