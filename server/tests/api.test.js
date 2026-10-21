// Automated API Verification Test Suite
const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Next-Generation College ERP API Verification Suite...\n');

  try {
    // 1. Healthcheck
    console.log('Test 1: Healthcheck');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'HEALTHY');
    console.log('  ✅ Backend is HEALTHY\n');

    // 2. Demo Users & Persona Switcher
    console.log('Test 2: Demo Personas');
    const demoRes = await fetch(`${BASE_URL}/api/auth/demo-users`);
    const demo = await demoRes.json();
    assert.ok(demo.demoUsers.length >= 8, 'Expected at least 8 demo personas');
    console.log(`  ✅ Loaded ${demo.demoUsers.length} role personas`);

    // Switch to Super Admin
    const adminAuthRes = await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' })
    });
    const adminAuth = await adminAuthRes.json();
    assert.ok(adminAuth.token, 'Super admin token missing');
    assert.strictEqual(adminAuth.user.role, 'SUPER_ADMIN');
    const adminToken = adminAuth.token;
    console.log('  ✅ Switched to Super Admin persona\n');

    // 3. Institution Structure
    console.log('Test 3: Institution & Academic Structure');
    const instRes = await fetch(`${BASE_URL}/api/institution`);
    const instData = await instRes.json();
    assert.strictEqual(instData.institution.code, 'AIT-PUNE');
    assert.ok(instData.departments.length >= 4);
    console.log(`  ✅ Verified institution: ${instData.institution.name} (${instData.departments.length} departments)\n`);

    // 4. Student Directory & 360 Profile
    console.log('Test 4: Student Information System (SIS)');
    const studRes = await fetch(`${BASE_URL}/api/students`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const studData = await studRes.json();
    assert.ok(studData.students.length > 0);
    const firstStudent = studData.students[0];
    
    // Fetch 360 profile
    const profileRes = await fetch(`${BASE_URL}/api/students/${firstStudent.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const profile = await profileRes.json();
    assert.ok(profile.student.prn);
    console.log(`  ✅ Loaded 360° Profile for: ${profile.student.full_name} (PRN ${profile.student.prn})`);
    console.log(`     - Invoices: ${profile.invoices.length}, Exam Marks: ${profile.marks.length}, Book Loans: ${profile.bookLoans.length}\n`);

    // 5. Smart Timetable Generator
    console.log('Test 5: Constraint-Based Smart Timetable Generator');
    const ttRes = await fetch(`${BASE_URL}/api/academics/generate-timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ division_id: 'div-comp-5a', auto_publish: false })
    });
    const ttData = await ttRes.json();
    assert.ok(ttData.success);
    assert.ok(ttData.slotsGenerated > 0);
    console.log(`  ✅ Smart Timetable Generated: ${ttData.slotsGenerated} conflict-free slots planned (${ttData.unsatisfiedConstraints} conflicts)\n`);

    // 6. Attendance Shortage Defaulters
    console.log('Test 6: Attendance Shortage Analyzer (< 75%)');
    const attRes = await fetch(`${BASE_URL}/api/attendance/shortage-report?threshold=75`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const attData = await attRes.json();
    assert.ok(attData.defaulters.length > 0);
    console.log(`  ✅ Defaulter report generated: ${attData.defaulters.length} students with attendance deficit detected\n`);

    // 7. Finance Summary
    console.log('Test 7: Fees & Financial Overview');
    const finRes = await fetch(`${BASE_URL}/api/finance/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const finData = await finRes.json();
    assert.ok(finData.summary.total_collected > 0);
    console.log(`  ✅ Financial Ledger Verified: Total Collected ₹${finData.summary.total_collected.toLocaleString('en-IN')}, Outstanding ₹${finData.summary.total_outstanding.toLocaleString('en-IN')}\n`);

    // 8. AI Campus Copilot (Role Scoped RAG)
    console.log('Test 8: AI Campus Copilot (Grounded Question Answering)');
    
    // Switch to Student Persona (Aarav)
    const studAuthRes = await fetch(`${BASE_URL}/api/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'stud_aarav' })
    });
    const studAuth = await studAuthRes.json();
    const studToken = studAuth.token;

    const aiRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studToken}`
      },
      body: JSON.stringify({ prompt: 'Show my attendance for this semester' })
    });
    const aiData = await aiRes.json();
    assert.ok(aiData.success);
    assert.ok(aiData.response.includes('Attendance Summary'));
    console.log('  ✅ Student AI Copilot Query: Returned verified attendance data');

    // Faculty AI Query for notice drafting
    const aiNoticeRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ prompt: 'Draft a department notice for the next examination' })
    });
    const aiNotice = await aiNoticeRes.json();
    assert.ok(aiNotice.response.includes('Draft Notice: Semester Examination'));
    console.log('  ✅ Faculty AI Notice Drafting: Generated compliant circular\n');

    // 9. Universal ERP Search
    console.log('Test 9: Universal ERP Cross-Entity Search');
    const searchRes = await fetch(`${BASE_URL}/api/search?q=Aarav`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    assert.ok(searchData.results.students.length > 0);
    console.log(`  ✅ Universal Search found student: ${searchData.results.students[0].title} (${searchData.results.students[0].subtitle})\n`);

    // 10. Public Certificate Verification
    console.log('Test 10: Public Digital Certificate Verification');
    const verifyRes = await fetch(`${BASE_URL}/api/service-desk/verify/AIT-BONAFIDE-2026-PRN2023COMP0045-VERIFIED-98317`);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.valid, true);
    console.log(`  ✅ Public Certificate verified: ${verifyData.certificate_details.student_name} (${verifyData.certificate_details.prn})\n`);

    console.log('🎉 ALL 10 CORE WORKFLOW API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  }
}

runTests();
