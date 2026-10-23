const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runSmartTimetableTests() {
  console.log('🧪 Starting FEATURE D: Smart Timetable Assistance Verification Suite...\n');

  try {
    // 1. Authenticate personas
    console.log('Test D1: Authenticate Admin & HOD Personas');
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

    // 2. Role-based Access Control
    console.log('Test D2: Role Scoping (Student Forbidden from Generating Schedules)');
    const studentGen = await fetch(`${BASE_URL}/api/academics/generate-timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ division_id: 'div-comp-5a' })
    });
    assert.strictEqual(studentGen.status, 403);
    console.log('  ✅ Unauthorized timetable generation blocked with 403 Forbidden\n');

    // 3. Generate Timetable with Configurable Constraints & Laboratory Differentiation
    console.log('Test D3: Generate Schedule with Configurable Constraints & Lab/Room Allocation');
    const genRes = await fetch(`${BASE_URL}/api/academics/generate-timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        division_id: 'div-comp-5a',
        auto_publish: false,
        constraints: {
          faculty_max_hours_per_day: 3,
          max_subject_hours_per_day: 2,
          division_max_hours_per_day: 5,
          available_rooms: ['LH-302', 'LH-303'],
          available_labs: ['Computing Lab 1', 'AI & Data Lab']
        }
      })
    });
    assert.strictEqual(genRes.status, 200);
    const genData = await genRes.json();
    assert.strictEqual(genData.success, true);
    assert.ok(genData.slotsGenerated > 0, 'Must generate conflict-free slots');
    assert.strictEqual(genData.constraintsApplied.faculty_max_hours_per_day, 3);
    assert.strictEqual(genData.constraintsApplied.division_max_hours_per_day, 5);

    // Verify room/lab distinction
    const hasLabSlot = genData.schedule.some(s => s.is_laboratory);
    const hasTheorySlot = genData.schedule.some(s => !s.is_laboratory);
    console.log(`  ✅ Generated ${genData.slotsGenerated} slots (Lab slots present: ${hasLabSlot}, Theory slots present: ${hasTheorySlot})`);
    console.log('  ✅ Configurable constraints applied successfully\n');

    // 4. Conflict Detection & Unsatisfiable Constraints Explanation
    console.log('Test D4: Conflict Detection & Unsatisfiable Constraints Explanation');
    // Deliberately over-constrain: limit division to 1 hour per day and restrict faculty
    const strictRes = await fetch(`${BASE_URL}/api/academics/generate-timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        division_id: 'div-comp-5a',
        auto_publish: false,
        constraints: {
          faculty_max_hours_per_day: 1,
          division_max_hours_per_day: 1,
          preferred_days: ['Monday', 'Tuesday']
        }
      })
    });
    assert.strictEqual(strictRes.status, 200);
    const strictData = await strictRes.json();
    assert.ok(strictData.unsatisfiedConstraints > 0, 'Over-constrained schedule must record unsatisfied constraints');
    assert.ok(strictData.conflictExplanations.length > 0, 'Must return detailed conflict explanations');

    const sampleConflict = strictData.conflictExplanations[0];
    assert.ok(sampleConflict.reason.length > 0);
    assert.ok(sampleConflict.suggestedResolution.length > 0);
    console.log(`  ✅ Unsatisfied constraint explanation captured: "${sampleConflict.reason}"`);
    console.log(`  ✅ Suggested resolution: "${sampleConflict.suggestedResolution}"\n`);

    // 5. Pre-flight Conflict Detection
    console.log('Test D5: Pre-flight Conflict Check API');
    const checkRes = await fetch(`${BASE_URL}/api/academics/timetable/conflict-check?day_of_week=Monday&time_slot=09:00 - 10:00&room_or_lab=LH-302`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(checkRes.status, 200);
    const checkData = await checkRes.json();
    assert.ok('hasConflict' in checkData);
    console.log(`  ✅ Conflict check endpoint responded: hasConflict=${checkData.hasConflict}\n`);

    console.log('🎉 ALL FEATURE D (SMART TIMETABLE ASSISTANCE) TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Feature D Test Failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runSmartTimetableTests();
