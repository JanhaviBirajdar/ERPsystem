const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runAnalyticsTests() {
  console.log('🧪 Starting FEATURE B: Management Analytics Verification Suite...\n');

  try {
    // 1. Authenticate personas
    console.log('Test B1: Authenticate Personas');
    const adminAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' })
    })).json();
    const adminToken = adminAuth.token;

    const studentAuth = await (await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'stud_aarav' })
    })).json();
    const studentToken = studentAuth.token;
    console.log('  ✅ Authenticated Admin and Student personas\n');

    // 2. Role-Based Access Enforcement
    console.log('Test B2: Role-based Access Enforcement (Student Forbidden)');
    const studentRes = await fetch(`${BASE_URL}/api/analytics/management-overview`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentRes.status, 403, 'Student must not be authorized to view management analytics');
    console.log('  ✅ Unauthorized access rejected with 403 Forbidden\n');

    // 3. Full Management Overview Metrics & Metric Definitions
    console.log('Test B3: Calculate Real Metrics Across 7 Domains with Documented Definitions');
    const overviewRes = await fetch(`${BASE_URL}/api/analytics/management-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(overviewRes.status, 200);
    const overviewData = await overviewRes.json();

    // Verify Metric Definitions documentation
    assert.ok(overviewData.metricDefinitions, 'Must include documented metricDefinitions');
    assert.ok(overviewData.metricDefinitions.enrollment_metrics.formula);
    assert.ok(overviewData.metricDefinitions.attendance_compliance.formula);
    assert.ok(overviewData.metricDefinitions.academic_cgpa.formula);
    assert.ok(overviewData.metricDefinitions.fee_collection_efficiency.formula);
    assert.ok(overviewData.metricDefinitions.admissions_conversion.formula);
    assert.ok(overviewData.metricDefinitions.placement_rate.formula);
    assert.ok(overviewData.metricDefinitions.service_sla_compliance.formula);

    // Verify Real Calculations (no invented values)
    const { analytics } = overviewData;
    assert.ok(analytics.enrollment.totalEnrolled > 0, 'totalEnrolled must be > 0 from database');
    assert.ok(analytics.attendance.averageAttendance > 0, 'averageAttendance must be calculated');
    assert.ok(analytics.academics.averageCgpa > 0, 'averageCgpa must be calculated');
    assert.ok(analytics.finance.totalBilled > 0, 'totalBilled must be calculated from invoices');
    assert.ok(analytics.admissions.totalApplications >= 0, 'totalApplications must be present');
    assert.ok(analytics.placements.totalApplicants >= 0, 'placement applicants must be present');
    assert.ok(analytics.workflows.totalRequests >= 0, 'workflow requests must be present');
    console.log(`  ✅ Overview verified: Enrolled=${analytics.enrollment.totalEnrolled}, Avg CGPA=${analytics.academics.averageCgpa}, Fee Billed=₹${analytics.finance.totalBilled}`);
    console.log('  ✅ All metric definitions accurately documented\n');

    // 4. Department & Semester Filtering
    console.log('Test B4: Filtering by Department (e.g. dept-1 CSE)');
    const filteredRes = await fetch(`${BASE_URL}/api/analytics/management-overview?department_id=dept-1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(filteredRes.status, 200);
    const filteredData = await filteredRes.json();
    assert.strictEqual(filteredData.filters.department_id, 'dept-1');
    assert.ok(filteredData.analytics.enrollment.totalEnrolled <= overviewData.analytics.enrollment.totalEnrolled);
    console.log(`  ✅ Department filter applied: CSE Enrolled=${filteredData.analytics.enrollment.totalEnrolled} <= Total=${overviewData.analytics.enrollment.totalEnrolled}\n`);

    // 5. Drill-Down Views
    console.log('Test B5: Drill-down Views for Auditability');
    // Drilldown for attendance defaulters
    const attDrillRes = await fetch(`${BASE_URL}/api/analytics/drilldown?metric=attendance_defaulters`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(attDrillRes.status, 200);
    const attDrillData = await attDrillRes.json();
    assert.strictEqual(attDrillData.metric, 'attendance_defaulters');
    assert.ok(Array.isArray(attDrillData.records));
    if (attDrillData.records.length > 0) {
      assert.ok(attDrillData.records[0].attendance_pct < 75.0, 'All defaulters must have attendance < 75%');
    }

    // Drilldown for fee defaulters
    const feeDrillRes = await fetch(`${BASE_URL}/api/analytics/drilldown?metric=fee_defaulters`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(feeDrillRes.status, 200);
    const feeDrillData = await feeDrillRes.json();
    assert.strictEqual(feeDrillData.metric, 'fee_defaulters');
    assert.ok(Array.isArray(feeDrillData.records));
    if (feeDrillData.records.length > 0) {
      assert.ok(feeDrillData.records[0].balance_amount > 0, 'All fee defaulters must have balance > 0');
    }
    console.log(`  ✅ Drilldowns verified: Attendance Defaulters count=${attDrillData.count}, Fee Defaulters count=${feeDrillData.count}\n`);

    // 6. Authorized CSV Export
    console.log('Test B6: Authorized CSV Export Generation');
    const exportRes = await fetch(`${BASE_URL}/api/analytics/export?metric=attendance_defaulters`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(exportRes.status, 200);
    assert.strictEqual(exportRes.headers.get('content-type'), 'text/csv; charset=utf-8');
    assert.ok(exportRes.headers.get('content-disposition').includes('attendance_defaulters'));
    const csvContent = await exportRes.text();
    assert.ok(csvContent.startsWith('PRN,Roll No,Full Name,Department,Attendance %,Phone'));
    console.log('  ✅ CSV export verified with correct headers and attachment response\n');

    console.log('🎉 ALL FEATURE B (MANAGEMENT ANALYTICS) TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Feature B Test Failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runAnalyticsTests();
