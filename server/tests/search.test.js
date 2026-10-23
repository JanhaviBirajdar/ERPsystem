const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runSearchTests() {
  console.log('🧪 Starting FEATURE E: Intelligent Universal Search Verification Suite...\n');

  try {
    // 1. Authenticate personas
    console.log('Test E1: Authenticate Admin and Student Personas');
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

    // 2. Multi-Entity Unified Search
    console.log('Test E2: Unified Search Across Students, Courses, Notices, Requests, Tickets');
    const searchRes = await fetch(`${BASE_URL}/api/search?q=Comp`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(searchData.results);
    assert.ok(Array.isArray(searchData.results.students));
    assert.ok(Array.isArray(searchData.results.faculty));
    assert.ok(Array.isArray(searchData.results.subjects));
    assert.ok(Array.isArray(searchData.results.notices));
    assert.ok(Array.isArray(searchData.results.requests));
    assert.strictEqual(searchData.meta.roleScoped, true);
    assert.strictEqual(searchData.meta.sanitized, true);
    console.log(`  ✅ Unified search returned: ${searchData.meta.totalResults} records across entities\n`);

    // 3. Pre-Retrieval Permission Enforcement (Redaction of Peer Metrics)
    console.log('Test E3: Cross-Role Leakage Guard (Student Peer Metrics Redaction)');
    const peerSearchRes = await fetch(`${BASE_URL}/api/search?q=Rohan`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(peerSearchRes.status, 200);
    const peerData = await peerSearchRes.json();
    const peerStudent = peerData.results.students.find(s => s.title.includes('Rohan'));
    if (peerStudent) {
      assert.strictEqual(peerStudent.attendance_pct, null, 'Peer student attendance % MUST be redacted');
      assert.strictEqual(peerStudent.current_cgpa, null, 'Peer student CGPA MUST be redacted');
      console.log('  ✅ Verified peer student metrics are completely redacted for student search');
    }

    // Now verify Admin DOES see the academic metrics
    const adminPeerRes = await fetch(`${BASE_URL}/api/search?q=Rohan`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminPeerRes.status, 200);
    const adminPeerData = await adminPeerRes.json();
    const adminPeerStudent = adminPeerData.results.students.find(s => s.title.includes('Rohan'));
    if (adminPeerStudent) {
      assert.ok(adminPeerStudent.attendance_pct !== null, 'Admin must see attendance for authorized oversight');
      assert.ok(adminPeerStudent.current_cgpa !== null, 'Admin must see CGPA for authorized oversight');
      console.log('  ✅ Authorized administrator successfully accesses complete student metrics\n');
    }

    // 4. Pre-Retrieval Notice Audience Scoping
    console.log('Test E4: Notice Pre-Retrieval Audience Isolation');
    const noticeSearchRes = await fetch(`${BASE_URL}/api/search?q=Notice`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(noticeSearchRes.status, 200);
    const noticeData = await noticeSearchRes.json();
    for (const n of noticeData.results.notices) {
      assert.ok(['ALL', 'STUDENTS'].includes(n.target_audience), `Student must never retrieve notice for audience: ${n.target_audience}`);
    }
    console.log('  ✅ Student search guarantees no confidential faculty/HOD circulars are leaked\n');

    // 5. Untrusted Data Sanitization
    console.log('Test E5: Untrusted Data Input & Injection Sanitization');
    const xssSearchRes = await fetch(`${BASE_URL}/api/search?q=<script>alert("xss")</script>{{payload}}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(xssSearchRes.status, 200);
    const xssData = await xssSearchRes.json();
    assert.ok(!xssData.query.includes('<script>'), 'Unescaped script tags must not be returned');
    assert.ok(xssData.query.includes('&lt;script&gt;'), 'HTML entities must be properly escaped');
    assert.ok(!xssData.query.includes('{{'), 'Template delimiters must be escaped');
    console.log(`  ✅ Sanitization verified: Input query neutralized to "${xssData.query}"\n`);

    // 6. Security Telemetry Logging
    console.log('Test E6: Search Telemetry Audit Logging');
    const db = require('../db/database');
    const logs = db.prepare('SELECT * FROM search_audit_logs ORDER BY created_at DESC LIMIT 5').all();
    assert.ok(logs.length > 0, 'Audit telemetry log entries must be created');
    assert.ok(logs[0].execution_time_ms >= 0);
    assert.ok(!('query' in logs[0]), 'Raw user search queries must NOT be stored in audit logs to protect privacy');
    console.log(`  ✅ Telemetry verified: Logged ${logs.length} search events without sensitive query storage\n`);

    console.log('🎉 ALL FEATURE E (INTELLIGENT SEARCH) TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Feature E Test Failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runSearchTests();
