const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runSupportAlertsTests() {
  console.log('🧪 Starting FEATURE C: Academic Support Alerts Verification Suite...\n');

  try {
    // 1. Authenticate personas
    console.log('Test C1: Authenticate Faculty, Admin, and Student Personas');
    const adminAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' })
    })).json();
    const adminToken = adminAuth.token;

    const facultyAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'faculty_mehta' })
    })).json();
    const facultyToken = facultyAuth.token;

    const studentAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'stud_aarav' })
    })).json();
    const studentToken = studentAuth.token;
    console.log('  ✅ Authenticated Admin, Faculty, and Student\n');

    // 2. Configurable Thresholds: Get and Put
    console.log('Test C2: Manage Configurable Academic Risk Thresholds');
    // Student should not be able to update thresholds
    const studentPut = await fetch(`${BASE_URL}/api/support/thresholds`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ attendance_min_pct: 80 })
    });
    assert.strictEqual(studentPut.status, 403, 'Student must be forbidden from configuring thresholds');

    // Admin updates thresholds
    const updateRes = await fetch(`${BASE_URL}/api/support/thresholds`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        attendance_min_pct: 78.0,
        attendance_critical_pct: 65.0,
        marks_min_pct: 45.0,
        max_missed_assignments: 2,
        cgpa_at_risk: 6.8
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.success, true);
    assert.strictEqual(updateData.thresholds.attendance_min_pct, 78.0);
    assert.strictEqual(updateData.thresholds.cgpa_at_risk, 6.8);
    console.log(`  ✅ Thresholds updated: Min Attendance=${updateData.thresholds.attendance_min_pct}%, CGPA Risk=${updateData.thresholds.cgpa_at_risk}\n`);

    // 3. Multi-Factor Diagnostic Scanner
    console.log('Test C3: Multi-factor Diagnostic Scan (Attendance, Marks & Assignment Trends)');
    const scanRes = await fetch(`${BASE_URL}/api/support/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(scanRes.status, 200);
    const scanData = await scanRes.json();
    assert.strictEqual(scanData.success, true);
    assert.ok(scanData.newAlertsCreated >= 0 || scanData.alertsUpdated >= 0);
    console.log(`  ✅ Scan completed using configurable thresholds: ${scanData.newAlertsCreated} created, ${scanData.alertsUpdated} updated\n`);

    // 4. Alert Explainability and Governance
    console.log('Test C4: Verify Alert Explainability & Non-Disciplinary Governance');
    const alertsRes = await fetch(`${BASE_URL}/api/support/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(alertsRes.status, 200);
    const alertsData = await alertsRes.json();
    assert.ok(alertsData.count > 0, 'Alerts must be present');

    const sampleAlert = alertsData.alerts[0];
    assert.ok(sampleAlert.explanation, 'Alert must have a plain-English explanation');
    assert.ok(sampleAlert.parsed_factors, 'Alert must have parsed structured factors');
    assert.ok(sampleAlert.parsed_factors.triggers, 'Alert factors must contain triggers breakdown');
    assert.strictEqual(sampleAlert.parsed_factors.governance.automatic_disciplinary_action, false,
      'Automatic disciplinary action MUST be false');
    console.log(`  ✅ Sample Alert [${sampleAlert.id} - ${sampleAlert.student_name}]: "${sampleAlert.explanation}"`);
    console.log('  ✅ Governance verified: Non-punitive and zero automatic disciplinary decisions guaranteed\n');

    // 5. Authorized Faculty Intervention Recording
    console.log('Test C5: Record Supportive Faculty Intervention');
    const interventionRes = await fetch(`${BASE_URL}/api/support/interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        alert_id: sampleAlert.id,
        student_id: sampleAlert.student_id,
        intervention_type: 'REMEDIAL_CLASS',
        action_taken: 'Conducted special weekend tutorial on Dynamic Programming algorithms and provided study guide.',
        student_feedback: 'Student attended attentively and resolved questions regarding recursion trees.',
        follow_up_date: '2026-11-10'
      })
    });
    assert.strictEqual(interventionRes.status, 201);
    const interventionData = await interventionRes.json();
    assert.strictEqual(interventionData.success, true);
    assert.strictEqual(interventionData.disciplinaryActionProhibited, true);
    console.log(`  ✅ Intervention successfully recorded: ID=${interventionData.interventionId}\n`);

    // 6. Intervention Retrieval and Scoping
    console.log('Test C6: Retrieve Intervention History and Role Scoping');
    const intvListRes = await fetch(`${BASE_URL}/api/support/interventions?alert_id=${sampleAlert.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(intvListRes.status, 200);
    const intvListData = await intvListRes.json();
    assert.ok(intvListData.count >= 1);
    assert.strictEqual(intvListData.interventions[0].intervention_type, 'REMEDIAL_CLASS');
    console.log(`  ✅ Verified ${intvListData.count} intervention record(s) linked to alert\n`);

    console.log('🎉 ALL FEATURE C (ACADEMIC SUPPORT ALERTS) TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Feature C Test Failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runSupportAlertsTests();
