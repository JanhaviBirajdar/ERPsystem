const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/academics/subjects - Subjects with syllabus completion
router.get('/subjects', authenticate, (req, res) => {
  const { department_id, semester_id } = req.query;

  let query = `
    SELECT sub.*, d.name as department_name, d.code as department_code, sem.number as semester_number
    FROM courses_subjects sub
    JOIN departments d ON sub.department_id = d.id
    JOIN semesters sem ON sub.semester_id = sem.id
    WHERE 1=1
  `;
  const params = [];

  if (department_id) {
    query += ' AND sub.department_id = ?';
    params.push(department_id);
  }

  if (semester_id) {
    query += ' AND sub.semester_id = ?';
    params.push(semester_id);
  }

  query += ' ORDER BY sub.code ASC';

  const subjects = db.prepare(query).all(...params);
  res.json({ subjects });
});

// PUT /api/academics/subjects/:id/syllabus - Update syllabus progress
router.put('/subjects/:id/syllabus', authenticate, authorize(['SUPER_ADMIN', 'HOD', 'FACULTY']), (req, res) => {
  const { syllabus_completed_pct } = req.body;
  if (syllabus_completed_pct === undefined || syllabus_completed_pct < 0 || syllabus_completed_pct > 100) {
    return res.status(400).json({ error: 'Valid percentage between 0 and 100 required' });
  }

  db.prepare(`
    UPDATE courses_subjects
    SET syllabus_completed_pct = ?
    WHERE id = ?
  `).run(syllabus_completed_pct, req.params.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_SYLLABUS', 'SUBJECT', req.params.id, { progress: syllabus_completed_pct }, req);
  res.json({ success: true, message: 'Syllabus progress updated' });
});

// GET /api/academics/timetable/:divisionId - Division weekly timetable
router.get('/timetable/:divisionId', authenticate, (req, res) => {
  const timetable = db.prepare(`
    SELECT tt.*, sub.code as subject_code, sub.name as subject_name, sub.credits,
           f.full_name as faculty_name, f.emp_code
    FROM timetables tt
    JOIN courses_subjects sub ON tt.subject_id = sub.id
    JOIN faculty f ON tt.faculty_id = f.id
    WHERE tt.division_id = ?
    ORDER BY CASE tt.day_of_week
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
      ELSE 7 END, tt.time_slot
  `).all(req.params.divisionId);

  res.json({ divisionId: req.params.divisionId, timetable });
});

// POST /api/academics/generate-timetable - Constraint-based Smart Timetable Generator
router.post('/generate-timetable', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { division_id, department_id, semester_id, auto_publish } = req.body;

  if (!division_id) {
    return res.status(400).json({ error: 'division_id is required' });
  }

  const division = db.prepare('SELECT * FROM divisions WHERE id = ?').get(division_id);
  if (!division) {
    return res.status(404).json({ error: 'Division not found' });
  }

  // Fetch subjects and allocations for this division
  const subjects = db.prepare(`
    SELECT sa.id as alloc_id, sa.subject_id, sa.faculty_id, sub.code, sub.name, sub.theory_hours, sub.practical_hours,
           f.full_name as faculty_name
    FROM subject_allocations sa
    JOIN courses_subjects sub ON sa.subject_id = sub.id
    JOIN faculty f ON sa.faculty_id = f.id
    WHERE sa.division_id = ?
  `).all(division_id);

  if (subjects.length === 0) {
    return res.status(400).json({ error: 'No subjects or faculty allocated to this division yet.' });
  }

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const SLOTS = [
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:15 - 12:15',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:15 - 16:15'
  ];
  const ROOM = division.room_number || 'LH-302';

  // Constraint Tracking Sets
  // 1. Faculty busy timeslot tracker: Set of `${faculty_id}_${day}_${slot}`
  // 2. Division busy timeslot tracker: Set of `${division_id}_${day}_${slot}`
  const existingEntries = db.prepare('SELECT division_id, day_of_week, time_slot, faculty_id FROM timetables').all();
  const busyFacultySlots = new Set();
  const busyDivisionSlots = new Set();

  for (const entry of existingEntries) {
    // If not regenerating this division, treat as fixed
    if (entry.division_id !== division_id) {
      busyFacultySlots.add(`${entry.faculty_id}_${entry.day_of_week}_${entry.time_slot}`);
    }
  }

  const generatedSchedule = [];
  const conflictsReport = [];
  let unsatisfiedConstraints = 0;

  // Track subject lectures per day limit (max 1 or 2 per subject per day)
  const subjectDayCounts = {};

  let subIndex = 0;
  for (const day of DAYS) {
    for (const slot of SLOTS) {
      // Rotate through subjects
      let assigned = false;
      let attempts = 0;

      while (!assigned && attempts < subjects.length) {
        const candidate = subjects[(subIndex + attempts) % subjects.length];
        const facKey = `${candidate.faculty_id}_${day}_${slot}`;
        const daySubKey = `${candidate.subject_id}_${day}`;
        const dayCount = subjectDayCounts[daySubKey] || 0;

        // Check Hard Constraints:
        // 1. Faculty is not busy in another division
        // 2. Max 2 sessions for same subject in 1 day
        if (!busyFacultySlots.has(facKey) && dayCount < 2) {
          busyFacultySlots.add(facKey);
          subjectDayCounts[daySubKey] = dayCount + 1;

          generatedSchedule.push({
            id: `tt-gen-${day.toLowerCase().slice(0, 2)}-${slot.slice(0, 2)}-${Math.floor(Math.random() * 1000)}`,
            division_id,
            day_of_week: day,
            time_slot: slot,
            subject_id: candidate.subject_id,
            subject_code: candidate.code,
            subject_name: candidate.name,
            faculty_id: candidate.faculty_id,
            faculty_name: candidate.faculty_name,
            room_or_lab: ROOM
          });

          assigned = true;
          subIndex = (subIndex + attempts + 1) % subjects.length;
        } else {
          attempts++;
        }
      }

      if (!assigned) {
        unsatisfiedConstraints++;
        conflictsReport.push(`No available conflict-free faculty found for ${day} at ${slot}`);
      }
    }
  }

  // If auto_publish is requested, save directly to database
  if (auto_publish) {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM timetables WHERE division_id = ?').run(division_id);
      const insert = db.prepare(`
        INSERT INTO timetables (id, division_id, day_of_week, time_slot, subject_id, faculty_id, room_or_lab)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of generatedSchedule) {
        insert.run(item.id, item.division_id, item.day_of_week, item.time_slot, item.subject_id, item.faculty_id, item.room_or_lab);
      }
      logAudit(req.user.id, req.user.role, 'PUBLISH_TIMETABLE', 'TIMETABLE', division_id, { slotsGenerated: generatedSchedule.length }, req);
    });
    tx();
  }

  res.json({
    success: true,
    division_name: division.name,
    totalSlotsPlanned: DAYS.length * SLOTS.length,
    slotsGenerated: generatedSchedule.length,
    unsatisfiedConstraints,
    conflictsReport,
    isPublished: !!auto_publish,
    schedule: generatedSchedule
  });
});

// POST /api/academics/timetable/slot - Schedule lecture with Conflict Detection
router.post('/timetable/slot', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { division_id, day_of_week, time_slot, subject_id, faculty_id, room_or_lab } = req.body;
  if (!division_id || !day_of_week || !time_slot || !subject_id || !faculty_id || !room_or_lab) {
    return res.status(400).json({ error: 'division_id, day_of_week, time_slot, subject_id, faculty_id, room_or_lab are all required' });
  }

  // 1. Faculty availability check (is faculty already booked in another division at this time?)
  const facultyConflict = db.prepare(`
    SELECT tt.*, div.name as division_name, sub.name as subject_name, f.full_name as faculty_name
    FROM timetables tt
    JOIN divisions div ON tt.division_id = div.id
    JOIN courses_subjects sub ON tt.subject_id = sub.id
    JOIN faculty f ON tt.faculty_id = f.id
    WHERE tt.faculty_id = ? AND tt.day_of_week = ? AND tt.time_slot = ? AND tt.division_id != ?
  `).get(faculty_id, day_of_week, time_slot, division_id);

  if (facultyConflict) {
    return res.status(409).json({
      error: `Faculty Conflict: Prof. ${facultyConflict.faculty_name} is already assigned to ${facultyConflict.division_name} (${facultyConflict.subject_name}) at ${day_of_week} ${time_slot}.`,
      conflictType: 'FACULTY_UNAVAILABLE',
      conflictingSlot: facultyConflict
    });
  }

  // 2. Room/Lab availability check (is classroom/lab already occupied by another division at this time?)
  const roomConflict = db.prepare(`
    SELECT tt.*, div.name as division_name, sub.name as subject_name
    FROM timetables tt
    JOIN divisions div ON tt.division_id = div.id
    JOIN courses_subjects sub ON tt.subject_id = sub.id
    WHERE tt.room_or_lab = ? AND tt.day_of_week = ? AND tt.time_slot = ? AND tt.division_id != ?
  `).get(room_or_lab, day_of_week, time_slot, division_id);

  if (roomConflict) {
    return res.status(409).json({
      error: `Room Conflict: ${room_or_lab} is already booked by ${roomConflict.division_name} (${roomConflict.subject_name}) at ${day_of_week} ${time_slot}.`,
      conflictType: 'ROOM_OCCUPIED',
      conflictingSlot: roomConflict
    });
  }

  // Remove any existing slot for this division at the same day & time
  db.prepare('DELETE FROM timetables WHERE division_id = ? AND day_of_week = ? AND time_slot = ?').run(division_id, day_of_week, time_slot);

  const slotId = `tt-${Date.now()}`;
  db.prepare(`
    INSERT INTO timetables (id, division_id, day_of_week, time_slot, subject_id, faculty_id, room_or_lab)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(slotId, division_id, day_of_week, time_slot, subject_id, faculty_id, room_or_lab);

  res.status(201).json({
    success: true,
    message: 'Lecture slot scheduled successfully without conflicts',
    slotId
  });
});

// DELETE /api/academics/timetable/slot/:id - Delete a scheduled slot
router.delete('/timetable/slot/:id', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  db.prepare('DELETE FROM timetables WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Lecture slot removed from timetable' });
});

// GET /api/academics/timetable/conflict-check - Conflict evaluation pre-flight
router.get('/timetable/conflict-check', authenticate, (req, res) => {
  const { faculty_id, room_or_lab, day_of_week, time_slot, division_id } = req.query;

  const facultyBusy = faculty_id ? db.prepare(`
    SELECT tt.*, div.name as division_name, sub.name as subject_name, f.full_name as faculty_name
    FROM timetables tt
    JOIN divisions div ON tt.division_id = div.id
    JOIN courses_subjects sub ON tt.subject_id = sub.id
    JOIN faculty f ON tt.faculty_id = f.id
    WHERE tt.faculty_id = ? AND tt.day_of_week = ? AND tt.time_slot = ?
  `).get(faculty_id, day_of_week, time_slot) : null;

  const roomBusy = room_or_lab ? db.prepare(`
    SELECT tt.*, div.name as division_name, sub.name as subject_name
    FROM timetables tt
    JOIN divisions div ON tt.division_id = div.id
    JOIN courses_subjects sub ON tt.subject_id = sub.id
    WHERE tt.room_or_lab = ? AND tt.day_of_week = ? AND tt.time_slot = ?
  `).get(room_or_lab, day_of_week, time_slot) : null;

  res.json({
    hasConflict: !!facultyBusy || !!roomBusy,
    facultyConflict: facultyBusy || null,
    roomConflict: roomBusy || null
  });
});

module.exports = router;

