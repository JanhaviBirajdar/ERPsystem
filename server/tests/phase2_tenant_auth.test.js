// Phase 2 Automated Verification Suite: Multi-Tenant MERN College ERP
const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2 Multi-Tenant MERN Verification Test Suite...\n');

  try {
    // -------------------------------------------------------------------------
    // Test 1: Service Healthcheck
    // -------------------------------------------------------------------------
    console.log('Test 1: Healthcheck & Phase 2 Service Status');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'HEALTHY');
    assert.strictEqual(health.phase, 'PHASE_2_COMPLETED');
    console.log('  ✅ Backend is HEALTHY and Phase 2 endpoints are active.\n');

    // -------------------------------------------------------------------------
    // Test 2: Authentication & Password Hashing Security
    // -------------------------------------------------------------------------
    console.log('Test 2: Authentication & Password Hashing Security');
    
    // 2a: Invalid password must fail
    const badLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_ait', password: 'wrongPassword999' })
    });
    assert.strictEqual(badLoginRes.status, 401, 'Expected 401 Unauthorized for bad password');
    const badLoginData = await badLoginRes.json();
    assert.strictEqual(badLoginData.error.code, 'INVALID_CREDENTIALS');
    console.log('  ✅ Rejected invalid credentials with 401 Unauthorized.');

    // 2b: Valid login for College 1 Admin (AIT Pune)
    const aitLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_ait', password: 'admin123' })
    });
    assert.strictEqual(aitLoginRes.status, 200);
    const aitAuth = await aitLoginRes.json();
    assert.ok(aitAuth.data.token, 'Token missing in login response');
    assert.strictEqual(aitAuth.data.user.role, 'COLLEGE_ADMIN');
    assert.strictEqual(aitAuth.data.user.tenant.code, 'AITPUNE');
    assert.strictEqual(aitAuth.data.user.passwordHash, undefined, 'Password hash must never be exposed!');
    const aitToken = aitAuth.data.token;
    console.log(`  ✅ Successfully authenticated College 1 Admin: ${aitAuth.data.user.fullName} (Tenant: ${aitAuth.data.user.tenant.code})`);

    // 2c: Valid login for College 2 Admin (PIME)
    const pimeLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_pime', password: 'pime123' })
    });
    assert.strictEqual(pimeLoginRes.status, 200);
    const pimeAuth = await pimeLoginRes.json();
    assert.strictEqual(pimeAuth.data.user.role, 'COLLEGE_ADMIN');
    assert.strictEqual(pimeAuth.data.user.tenant.code, 'PIME');
    const pimeToken = pimeAuth.data.token;
    console.log(`  ✅ Successfully authenticated College 2 Admin: ${pimeAuth.data.user.fullName} (Tenant: ${pimeAuth.data.user.tenant.code})\n`);

    // -------------------------------------------------------------------------
    // Test 3: Institution Registration & College Onboarding
    // -------------------------------------------------------------------------
    console.log('Test 3: Institution Registration & College Onboarding');
    const uniqueSub = `college-${Date.now().toString().slice(-4)}`;
    const uniqueCode = `COL${Date.now().toString().slice(-4)}`;

    const onboardRes = await fetch(`${BASE_URL}/api/v1/auth/onboard-college`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'St. Vincent College of Engineering',
        tenantCode: uniqueCode,
        subdomain: uniqueSub,
        adminUsername: `admin_${uniqueSub}`,
        adminPassword: 'Password@2026',
        adminFullName: 'Dr. Vincent Fernandez',
        adminEmail: `admin@${uniqueSub}.edu.in`
      })
    });
    assert.strictEqual(onboardRes.status, 201);
    const onboardData = await onboardRes.json();
    assert.strictEqual(onboardData.data.institution.tenantCode, uniqueCode);
    console.log(`  ✅ Onboarded new institution: ${onboardData.data.institution.name} (Code: ${uniqueCode}, Subdomain: ${uniqueSub})`);

    // Duplicate tenant code must fail
    const dupRes = await fetch(`${BASE_URL}/api/v1/auth/onboard-college`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate College',
        tenantCode: uniqueCode,
        subdomain: `other-${uniqueSub}`,
        adminUsername: 'admin_dup',
        adminPassword: 'Password@2026',
        adminEmail: 'admin@dup.edu.in'
      })
    });
    assert.strictEqual(dupRes.status, 409, 'Expected 409 Conflict for duplicate tenant code');
    console.log('  ✅ Duplicate tenant registration properly rejected with 409 Conflict.\n');

    // -------------------------------------------------------------------------
    // Test 4: Academic Structure Configuration (Departments, Years, Courses, Divisions)
    // -------------------------------------------------------------------------
    console.log('Test 4: Academic Configuration in Authorized Tenant');
    
    const runSuffix = Math.floor(1000 + Math.random() * 9000);
    const testDeptCode = `EX${runSuffix}`;
    const testCourseCode = `ET${runSuffix}`;

    // Create new department for AIT Pune
    const createDeptRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aitToken}`
      },
      body: JSON.stringify({
        code: testDeptCode,
        name: 'Electronics & Telecommunication',
        intakeCapacity: 60
      })
    });
    assert.strictEqual(createDeptRes.status, 201);
    const newDeptData = await createDeptRes.json();
    const extcDeptId = newDeptData.data.department._id;
    console.log(`  ✅ College 1 Admin created Department: ${testDeptCode} (ID: ${extcDeptId})`);

    // Create course in this department
    const createCourseRes = await fetch(`${BASE_URL}/api/v1/academic-config/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aitToken}`
      },
      body: JSON.stringify({
        code: testCourseCode,
        name: 'Microcontrollers & Embedded IoT',
        departmentId: extcDeptId,
        credits: 4
      })
    });
    assert.strictEqual(createCourseRes.status, 201);
    console.log(`  ✅ College 1 Admin created Course: ${testCourseCode} (Microcontrollers)`);


    // Create division
    const createDivRes = await fetch(`${BASE_URL}/api/v1/academic-config/divisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aitToken}`
      },
      body: JSON.stringify({
        departmentId: extcDeptId,
        name: 'Third Year Div A',
        roomNumber: 'LH-105'
      })
    });
    assert.strictEqual(createDivRes.status, 201);
    console.log('  ✅ College 1 Admin created Division: Third Year Div A\n');

    // -------------------------------------------------------------------------
    // Test 5: Server-Side RBAC Enforcement (Forbidden Role Access)
    // -------------------------------------------------------------------------
    console.log('Test 5: Server-Side RBAC Enforcement');
    // Login as Faculty (Priya Mehta)
    const facLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'faculty_mehta_ait', password: 'faculty123' })
    });
    const facAuth = await facLoginRes.json();
    const facToken = facAuth.data.token;

    // Faculty attempting to create a department must be blocked with 403 Forbidden
    const unauthDeptRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facToken}`
      },
      body: JSON.stringify({ code: 'CIVIL', name: 'Civil Engineering' })
    });
    assert.strictEqual(unauthDeptRes.status, 403, 'Faculty must not be permitted to create departments');
    const unauthData = await unauthDeptRes.json();
    assert.strictEqual(unauthData.error.code, 'FORBIDDEN_ROLE_ACCESS');
    console.log('  ✅ Faculty role correctly blocked from creating department (403 Forbidden).\n');

    // -------------------------------------------------------------------------
    // Test 6: CROSS-TENANT DATA ISOLATION (Strict Security Verification)
    // -------------------------------------------------------------------------
    console.log('Test 6: Cross-Tenant Data Isolation & Tampering Protection');

    // 6a: College 2 Admin (PIME) queries departments
    const pimeDeptsRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      headers: { Authorization: `Bearer ${pimeToken}` }
    });
    const pimeDeptsData = await pimeDeptsRes.json();
    
    // Assert PIME sees only its own departments ('IT', 'MECH') and ZERO AIT departments!
    const pimeDeptCodes = pimeDeptsData.data.departments.map(d => d.code);
    assert.ok(pimeDeptCodes.includes('IT'), 'PIME should see IT department');
    assert.ok(!pimeDeptCodes.includes('COMP'), 'CRITICAL: College 2 must NOT see College 1 Computer Engg department!');
    assert.ok(!pimeDeptCodes.includes('AIDS'), 'CRITICAL: College 2 must NOT see College 1 AI&DS department!');
    assert.ok(!pimeDeptCodes.includes('EXTC'), 'CRITICAL: College 2 must NOT see College 1 EXTC department!');
    console.log(`  ✅ College 2 queries departments: only sees [${pimeDeptCodes.join(', ')}]. Zero cross-tenant leakage.`);

    // 6b: College 2 Admin attempts to modify College 1's department by ID
    const crossModifyRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments/${extcDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pimeToken}`
      },
      body: JSON.stringify({ name: 'Hacked Department Name' })
    });
    assert.strictEqual(crossModifyRes.status, 404, 'Modifying another college department must return 404 Not Found');
    console.log('  ✅ Cross-tenant department update rejected (404 Not Found in tenant scope).');

    // 6c: Client attempts to supply an unauthorized tenant ID in the header while authenticated
    const aitTenantId = '64f9a0011111111111111111';
    const spoofHeaderRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      headers: {
        Authorization: `Bearer ${pimeToken}`,
        'X-Tenant-ID': aitTenantId // Trying to spoof AIT Pune's tenant ID
      }
    });
    assert.strictEqual(spoofHeaderRes.status, 403, 'Tampering tenant ID header must be rejected');
    const spoofData = await spoofHeaderRes.json();
    assert.strictEqual(spoofData.error.code, 'CROSS_TENANT_ACCESS_DENIED');
    console.log('  ✅ Client-supplied tenant impersonation header detected and blocked (403 Forbidden).\n');

    // -------------------------------------------------------------------------
    // Test 7: Centralized Error Handling & Validation
    // -------------------------------------------------------------------------
    console.log('Test 7: Centralized Error Handling & Validation');
    const badInputRes = await fetch(`${BASE_URL}/api/v1/academic-config/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aitToken}`
      },
      body: JSON.stringify({}) // Missing required fields
    });
    assert.strictEqual(badInputRes.status, 400);
    const badInputData = await badInputRes.json();
    assert.strictEqual(badInputData.success, false);
    assert.ok(badInputData.error.code);
    console.log(`  ✅ Server-side validation formatted error response: [${badInputData.error.code}] ${badInputData.error.message}\n`);

    // -------------------------------------------------------------------------
    // Test 8: Security Audit Trail Verification
    // -------------------------------------------------------------------------
    console.log('Test 8: System Security Audit Trail');
    const auditRes = await fetch(`${BASE_URL}/api/v1/audit/logs`, {
      headers: { Authorization: `Bearer ${aitToken}` }
    });
    assert.strictEqual(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.ok(auditData.data.logs.length > 0, 'Expected audit logs to be recorded');
    console.log(`  ✅ Audit logs recorded: Found ${auditData.data.logs.length} logged administrative events.`);
    console.log(`     Latest Action: ${auditData.data.logs[0].action} by role ${auditData.data.logs[0].userRole}\n`);

    console.log('🎉 ALL 8 PHASE 2 ACCEPTANCE CRITERIA TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Phase 2 test suite failed:', err);
    process.exit(1);
  }
}

runPhase2Tests();
