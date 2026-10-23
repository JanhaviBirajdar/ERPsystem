const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runWorkflowTests() {
  console.log('🧪 Starting Reusable Workflow Engine & Self-Service Automated Test Suite...\n');

  try {
    // 1. Healthcheck
    console.log('Test 1: Healthcheck');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'HEALTHY');
    console.log('  ✅ Backend is HEALTHY\n');

    // 2. Persona Tokens
    console.log('Test 2: Persona Authentication');
    // Admin
    const adminAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' })
    })).json();
    const adminToken = adminAuth.token;
    assert.strictEqual(adminAuth.user.role, 'SUPER_ADMIN');

    // HOD
    const hodAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hod_comp' })
    })).json();
    const hodToken = hodAuth.token;
    assert.strictEqual(hodAuth.user.role, 'HOD');

    // Student (Aarav)
    const studAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'stud_aarav' })
    })).json();
    const studToken = studAuth.token;
    assert.strictEqual(studAuth.user.role, 'STUDENT');

    // Faculty (Prof. Mehta)
    const facAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'faculty_mehta' })
    })).json();
    const facToken = facAuth.token;
    assert.strictEqual(facAuth.user.role, 'FACULTY');
    console.log('  ✅ Authenticated Admin, HOD, Faculty, and Student personas\n');

    // 3. Workflow Definitions
    console.log('Test 3: Workflow Definitions & Step Configuration');
    const defsRes = await fetch(`${BASE_URL}/api/workflows/definitions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const defsData = await defsRes.json();
    assert.ok(defsData.definitions.length >= 4, 'Expected at least 4 workflow definitions');
    const bonafideDef = defsData.definitions.find(d => d.id === 'wf-def-bonafide');
    assert.ok(bonafideDef);
    assert.strictEqual(bonafideDef.steps.length, 2);
    console.log(`  ✅ Loaded ${defsData.definitions.length} workflow definitions with configurable multi-tier approval steps\n`);

    // 4. Student Certificate Submission & Progress
    console.log('Test 4: Student Bonafide Certificate Request');
    const certSubmitRes = await fetch(`${BASE_URL}/api/workflows/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studToken}`
      },
      body: JSON.stringify({
        definition_id: 'wf-def-bonafide',
        title: 'Bonafide Certificate for Passport & International Hackathon',
        formData: {
          certificateType: 'BONAFIDE_CERTIFICATE',
          purpose: 'Passport Application & International Visa Verification',
          academicYear: '2025-26',
          semester: 'Semester 5'
        }
      })
    });
    const certSubmitData = await certSubmitRes.json();
    assert.ok(certSubmitData.success, 'Certificate submission failed');
    const certInstance = certSubmitData.instance;
    assert.strictEqual(certInstance.status, 'IN_REVIEW');
    assert.strictEqual(certInstance.current_step, 1);
    assert.strictEqual(certInstance.current_assigned_role, 'HOD');
    console.log(`  ✅ Certificate request created: #${certInstance.id} (Current Step: 1, Role: HOD)\n`);

    // 5. Security & Permission Tests: Unauthorized Step Approval
    console.log('Test 5: Permission Enforcement - Prevent Unauthorized Step Approval');
    // Student attempts to approve own certificate request
    const unauthorizedStudentRes = await fetch(`${BASE_URL}/api/workflows/instances/${certInstance.id}/action`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studToken}`
      },
      body: JSON.stringify({ action: 'APPROVED', comments: 'Self approval attempt' })
    });
    assert.strictEqual(unauthorizedStudentRes.status, 403, 'Expected 403 for student self-approval');
    const unauthErr = await unauthorizedStudentRes.json();
    assert.ok(unauthErr.error.includes('Access denied'), 'Expected descriptive access denied message');
    console.log(`  ✅ Unauthorized student approval blocked: "${unauthErr.error}"\n`);

    // 6. Invalid Status Transition Prevention
    console.log('Test 6: Invalid Status Transition Prevention');
    // Try sending invalid action
    const invalidActionRes = await fetch(`${BASE_URL}/api/workflows/instances/${certInstance.id}/action`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hodToken}`
      },
      body: JSON.stringify({ action: 'INVALID_STATUS', comments: 'Test invalid' })
    });
    assert.strictEqual(invalidActionRes.status, 400, 'Expected 400 for invalid action');
    console.log('  ✅ Invalid status transition prevented\n');

    // 7. Step 1 Approval by HOD
    console.log('Test 7: Step 1 Approval by HOD');
    const hodApproveRes = await fetch(`${BASE_URL}/api/workflows/instances/${certInstance.id}/action`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hodToken}`
      },
      body: JSON.stringify({
        action: 'APPROVED',
        comments: 'Verified 84.5% attendance and clean disciplinary record. Recommended.'
      })
    });
    const hodApproveData = await hodApproveRes.json();
    assert.ok(hodApproveData.success);
    assert.strictEqual(hodApproveData.instance.current_step, 2, 'Expected advancement to Step 2');
    assert.strictEqual(hodApproveData.instance.current_assigned_role, 'SUPER_ADMIN');
    console.log('  ✅ Step 1 approved by HOD, automatically forwarded to Step 2 (Registrar / Admin)\n');

    // 8. Step 2 Final Approval & Verifiable Document Generation
    console.log('Test 8: Step 2 Final Approval & Cryptographic Document Generation');
    const adminApproveRes = await fetch(`${BASE_URL}/api/workflows/instances/${certInstance.id}/action`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action: 'APPROVED',
        comments: 'Sanctioned and verified. Official digital seal applied.'
      })
    });
    const adminApproveData = await adminApproveRes.json();
    assert.ok(adminApproveData.success);
    assert.strictEqual(adminApproveData.instance.status, 'APPROVED');
    assert.ok(adminApproveData.instance.generated_doc_id, 'Expected generated document ID');
    const generatedDocId = adminApproveData.instance.generated_doc_id;
    console.log(`  ✅ Final approval granted. Verifiable document generated: ${generatedDocId}\n`);

    // 9. Document Access Validation
    console.log('Test 9: Document Access Validation');
    // Owner student requests document
    const docRes = await fetch(`${BASE_URL}/api/workflows/documents/${generatedDocId}`, {
      headers: { Authorization: `Bearer ${studToken}` }
    });
    const docData = await docRes.json();
    assert.strictEqual(docRes.status, 200);
    assert.ok(docData.document.verification_code);
    assert.ok(docData.document.content_html.includes('OFFICIAL'));
    const verCode = docData.document.verification_code;
    console.log(`  ✅ Student retrieved own document: ${docData.document.document_number} (Code: ${verCode})`);

    // Another student or unauthorized user trying to view it
    const studRohanAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'stud_rohan' })
    })).json();

    const rohanDocRes = await fetch(`${BASE_URL}/api/workflows/documents/${generatedDocId}`, {
      headers: { Authorization: `Bearer ${studRohanAuth.token}` }
    });
    assert.strictEqual(rohanDocRes.status, 403, 'Expected 403 for unauthorized document access');
    console.log('  ✅ Access to other students document forbidden (403)\n');

    // Public QR Verification Check
    console.log('Test 10: Public Cryptographic Document Verification');
    const pubVerifyRes = await fetch(`${BASE_URL}/api/workflows/documents/verify/${verCode}`);
    const pubVerifyData = await pubVerifyRes.json();
    assert.strictEqual(pubVerifyRes.status, 200);
    assert.strictEqual(pubVerifyData.valid, true);
    assert.strictEqual(pubVerifyData.templateType, 'BONAFIDE_CERTIFICATE');
    console.log(`  ✅ Public verification succeeded for ${pubVerifyData.documentNumber}: ${pubVerifyData.verificationStatus}\n`);

    // 11. Centralized Approval Inbox
    console.log('Test 11: Centralized Approval Inbox');
    const inboxRes = await fetch(`${BASE_URL}/api/workflows/inbox`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const inboxData = await inboxRes.json();
    assert.ok(Array.isArray(inboxData.inbox));
    console.log(`  ✅ Centralized approval inbox loaded: ${inboxData.inbox.length} pending items\n`);

    // 12. Notification Center & Deduplication Prevention
    console.log('Test 12: Notification Dispatch & Duplicate Prevention on Retries');
    const notificationService = require('../services/notificationService');
    const testIdempotencyKey = `test-idemp-${Date.now()}`;

    // First dispatch
    const notif1 = await notificationService.notify({
      userId: studAuth.user.id,
      title: 'Fee Payment Reminder',
      message: 'Final reminder for fee installment clearance.',
      category: 'REMINDER',
      idempotencyKey: testIdempotencyKey
    });
    assert.strictEqual(notif1.duplicatePrevented, false);
    console.log('  ✅ First notification dispatched successfully');

    // Retry with identical key (simulating retry storm or repeated job)
    const notif2 = await notificationService.notify({
      userId: studAuth.user.id,
      title: 'Fee Payment Reminder',
      message: 'Final reminder for fee installment clearance.',
      category: 'REMINDER',
      idempotencyKey: testIdempotencyKey
    });
    assert.strictEqual(notif2.duplicatePrevented, true);
    console.log('  ✅ Duplicate notification correctly prevented on retry!\n');

    // Searchable Notification Center
    console.log('Test 13: Searchable Notification Center');
    const notifsRes = await fetch(`${BASE_URL}/api/workflows/notifications?search=Fee`, {
      headers: { Authorization: `Bearer ${studToken}` }
    });
    const notifsData = await notifsRes.json();
    assert.ok(notifsData.notifications.length > 0);
    console.log(`  ✅ Search returned ${notifsData.notifications.length} matching notifications\n`);

    // 14. Department Announcements & Targeted Notices
    console.log('Test 14: Department Announcements');
    const annRes = await fetch(`${BASE_URL}/api/workflows/announcements`, {
      headers: { Authorization: `Bearer ${studToken}` }
    });
    const annData = await annRes.json();
    assert.ok(annData.announcements.length >= 3);
    console.log(`  ✅ Loaded ${annData.announcements.length} departmental announcements\n`);

    // 15. SLA Escalation & Scheduler Tick
    console.log('Test 15: Background Scheduler Tick & SLA Compliance');
    const tickRes = await fetch(`${BASE_URL}/api/workflows/scheduler/tick`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const tickData = await tickRes.json();
    assert.ok(tickData.success);
    console.log(`  ✅ Scheduler tick executed: ${tickData.result.workflowsProcessed} workflows inspected, SLA audits updated\n`);

    // 16. Institutional Reports & CSV Export
    console.log('Test 16: Institutional Reports & Export');
    const repRes = await fetch(`${BASE_URL}/api/workflows/reports?report_type=WORKFLOW_COMPLIANCE_DAILY`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const repData = await repRes.json();
    assert.ok(repData.report.summary.totalRequests > 0);
    console.log(`  ✅ SLA Compliance Report: ${repData.report.summary.complianceRate} compliance rate`);

    // CSV export test
    const csvRes = await fetch(`${BASE_URL}/api/workflows/reports?report_type=WORKFLOW_COMPLIANCE_DAILY&format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('Workflow Domain'));
    console.log('  ✅ CSV Export generated valid tabular output\n');

    console.log('🎉 ALL 16 WORKFLOW AUTOMATION & SELF-SERVICE TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test Failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runWorkflowTests();
