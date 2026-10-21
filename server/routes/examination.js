const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// Grade letter and point calculation logic (UGC / AICTE 10-point scale)
const calculateGrade = (pct) => {
  if (pct >= 90) return { grade_letter: 'O', grade_point: 10.0, description: 'Outstanding' };
  if (pct >= 80) return { grade_letter: 'A+', grade_point: 9.0, description: 'Excellent' };
  if (pct >= 70) return { grade_letter: 'A', grade_point: 8.0, description: 'Very Good' };
  if (pct >= 60) return { grade_letter: 'B+', grade_point: 7.0, description: 'Good' };
  if (pct >= 50) return { grade_letter: 'B', grade_point: 6.0, description: 'Above Average' };
  if (pct >= 45) return { grade_letter: 'C', grade_point: 5.0, description: 'Average' };
  if (pct >= 40) return { grade_letter: 'P', grade_point: 4.0, description: 'Pass' };
  return { grade_letter: 'F', grade_point: 0.0, description: 'Fail' };
};

// GET /api/examination/exams - List all exams
router.get('/exams', authenticate, (req, res) => {
  const exams = db.prepare(`
    SELECT e.*, ay.name as academic_year_name, sem.number as semester_number
    FROM examinations e
    JOIN academic_years ay ON e.academic_year_id = ay.id
    JOIN semesters sem ON e.semester_id = sem.id
    ORDER BY e.exam_date DESC
  `).all();
  res.json({ exams });
});

// GET /api/examination/marks - Filterable marks entries
router.get('/marks', authenticate, (req, res) => {
  const { examination_id, subject_id, division_id } = req.query;

  let query = `
    SELECT m.*, s.roll_no, s.full_name as student_name, s.prn,
           sub.name as subject_name, sub.code as subject_code,
           e.name as exam_name, e.max_marks, e.passing_marks
    FROM marks_entries m
    JOIN students s ON m.student_id = s.id
    JOIN courses_subjects sub ON m.subject_id = sub.id
    JOIN examinations e ON m.examination_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (examination_id) {
    query += ' AND m.examination_id = ?';
    params.push(examination_id);
  }
  if (subject_id) {
    query += ' AND m.subject_id = ?';
    params.push(subject_id);
  }
  if (division_id) {
    query += ' AND s.division_id = ?';
    params.push(division_id);
  }

  query += ' ORDER BY s.roll_no ASC';

  const marks = db.prepare(query).all(...params);
  res.json({ marks });
});

// POST /api/examination/marks/entry - Enter or update marks (Single or Batch)
router.post('/marks/entry', authenticate, authorize(['SUPER_ADMIN', 'HOD', 'FACULTY']), (req, res) => {
  const { examination_id, subject_id, entries } = req.body;

  if (!examination_id || !subject_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'examination_id, subject_id, and entries array are required' });
  }

  const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(examination_id);
  if (!exam) {
    return res.status(404).json({ error: 'Examination not found' });
  }

  // Check if marks are already locked
  const lockedCheck = db.prepare('SELECT is_locked FROM marks_entries WHERE examination_id = ? AND subject_id = ? AND is_locked = 1 LIMIT 1').get(examination_id, subject_id);
  if (lockedCheck && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Marks for this examination and subject are locked and cannot be edited without Super Admin authorization.' });
  }

  // Faculty id
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
  const facultyId = fac ? fac.id : null;

  const insertOrUpdate = db.prepare(`
    INSERT INTO marks_entries (id, examination_id, subject_id, student_id, marks_obtained, grade_letter, grade_point, is_locked, entered_by_faculty_id, entered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(examination_id, subject_id, student_id) DO UPDATE SET
      marks_obtained = excluded.marks_obtained,
      grade_letter = excluded.grade_letter,
      grade_point = excluded.grade_point,
      entered_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction(() => {
    for (const item of entries) {
      const marksVal = parseFloat(item.marks_obtained);
      const pct = (marksVal / exam.max_marks) * 100;
      const { grade_letter, grade_point } = calculateGrade(pct);
      const entryId = `mk-${item.student_id}-${subject_id}`;
      insertOrUpdate.run(entryId, examination_id, subject_id, item.student_id, marksVal, grade_letter, grade_point, facultyId);
    }

    logAudit(req.user.id, req.user.role, 'ENTER_MARKS', 'EXAMINATION', examination_id, { subject_id, count: entries.length }, req);
  });

  tx();

  res.json({ success: true, message: `Successfully recorded marks for ${entries.length} students` });
});

// POST /api/examination/marks/lock - Lock marks to prevent further editing
router.post('/marks/lock', authenticate, authorize(['SUPER_ADMIN', 'HOD']), (req, res) => {
  const { examination_id, subject_id } = req.body;
  if (!examination_id || !subject_id) {
    return res.status(400).json({ error: 'examination_id and subject_id are required' });
  }

  db.prepare(`
    UPDATE marks_entries
    SET is_locked = 1
    WHERE examination_id = ? AND subject_id = ?
  `).run(examination_id, subject_id);

  logAudit(req.user.id, req.user.role, 'LOCK_MARKS', 'EXAMINATION', examination_id, { subject_id }, req);
  res.json({ success: true, message: 'Marks locked successfully. No further modifications permitted.' });
});

// GET /api/examination/marksheet/:studentId - Generate semester marksheet with SGPA
router.get('/marksheet/:studentId', authenticate, (req, res) => {
  const student = db.prepare(`
    SELECT s.*, d.name as department_name, d.code as department_code, sem.number as semester_number
    FROM students s
    JOIN departments d ON s.department_id = d.id
    JOIN semesters sem ON s.semester_id = sem.id
    WHERE s.id = ? OR s.user_id = ?
  `).get(req.params.studentId, req.params.studentId);

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const marksList = db.prepare(`
    SELECT m.*, sub.code as subject_code, sub.name as subject_name, sub.credits,
           e.name as exam_name, e.exam_type, e.max_marks
    FROM marks_entries m
    JOIN courses_subjects sub ON m.subject_id = sub.id
    JOIN examinations e ON m.examination_id = e.id
    WHERE m.student_id = ?
  `).all(student.id);

  // Group marks by subject and calculate SGPA
  const subjectMap = {};
  let totalCredits = 0;
  let weightedPoints = 0;

  for (const m of marksList) {
    if (!subjectMap[m.subject_id]) {
      subjectMap[m.subject_id] = {
        code: m.subject_code,
        name: m.subject_name,
        credits: m.credits,
        exams: []
      };
    }
    subjectMap[m.subject_id].exams.push({
      exam_name: m.exam_name,
      marks: m.marks_obtained,
      max_marks: m.max_marks,
      grade_letter: m.grade_letter,
      grade_point: m.grade_point
    });

    totalCredits += m.credits;
    weightedPoints += m.grade_point * m.credits;
  }

  const sgpa = totalCredits > 0 ? Math.round((weightedPoints / totalCredits) * 100) / 100 : student.current_cgpa;

  res.json({
    student,
    academic_year: '2026-2027',
    semester: student.semester_number,
    calculated_sgpa: sgpa,
    result_status: sgpa >= 5.0 ? 'FIRST CLASS WITH DISTINCTION' : 'PASS',
    subjects: Object.values(subjectMap)
  });
});

// POST /api/examination/schedules - Schedule an Examination Paper
router.post('/schedules', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const room_allocation = req.body.room_allocation || req.body.room_or_hall;
  const { examination_id, subject_id, exam_date, start_time, end_time, max_marks = 100, passing_marks = 40, invigilator_faculty_id } = req.body;
  if (!examination_id || !subject_id || !exam_date || !start_time || !end_time || !room_allocation) {
    return res.status(400).json({ error: 'examination_id, subject_id, exam_date, start_time, end_time, and room_allocation are required' });
  }

  const id = `sched-${Date.now()}`;
  db.prepare(`
    INSERT INTO exam_schedules (id, examination_id, subject_id, exam_date, start_time, end_time, room_allocation, max_marks, passing_marks, invigilator_faculty_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, examination_id, subject_id, exam_date, start_time, end_time, room_allocation, max_marks, passing_marks, invigilator_faculty_id || null);

  res.status(201).json({ success: true, message: 'Examination paper scheduled successfully', id });
});

// GET /api/examination/schedules - List Exam Schedules
router.get('/schedules', authenticate, (req, res) => {
  const { examination_id } = req.query;
  let query = `
    SELECT es.*, e.name as exam_name, sub.name as subject_name, sub.code as subject_code,
           f.full_name as invigilator_name
    FROM exam_schedules es
    JOIN examinations e ON es.examination_id = e.id
    JOIN courses_subjects sub ON es.subject_id = sub.id
    LEFT JOIN faculty f ON es.invigilator_faculty_id = f.id
  `;
  const params = [];
  if (examination_id) {
    query += ' WHERE es.examination_id = ?';
    params.push(examination_id);
  }
  query += ' ORDER BY es.exam_date ASC, es.start_time ASC';

  const schedules = db.prepare(query).all(...params);
  res.json({ schedules });
});

// PUT /api/examination/exams/:id/publish - Publish Exam Results
router.put('/exams/:id/publish', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  // Check if exam exists
  const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  // Lock all marks for this examination upon official result publication
  db.prepare('UPDATE marks_entries SET is_locked = 1 WHERE examination_id = ?').run(req.params.id);

  logAudit(req.user.id, req.user.role, 'PUBLISH_EXAM_RESULTS', 'EXAMINATION', req.params.id, { examName: exam.name }, req);

  res.json({ success: true, message: `Results for '${exam.name}' published successfully and marks locked.` });
});

// POST /api/examination/revaluation - Submit Revaluation Request
router.post('/revaluation', authenticate, (req, res) => {
  const { marks_entry_id, reason } = req.body;
  if (!marks_entry_id || !reason) {
    return res.status(400).json({ error: 'marks_entry_id and reason are required' });
  }

  const mark = db.prepare('SELECT * FROM marks_entries WHERE id = ?').get(marks_entry_id);
  if (!mark) return res.status(404).json({ error: 'Marks entry not found' });

  // Get student ID
  let studentId = mark.student_id;
  if (req.user.role === 'STUDENT') {
    const s = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!s || s.id !== mark.student_id) {
      return res.status(403).json({ error: 'Cannot request revaluation for another student' });
    }
    studentId = s.id;
  }

  const id = `rev-${Date.now()}`;
  db.prepare(`
    INSERT INTO revaluation_requests (id, marks_entry_id, student_id, examination_id, subject_id, original_marks, status, reason)
    VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)
  `).run(id, marks_entry_id, studentId, mark.examination_id, mark.subject_id, mark.marks_obtained, reason);

  res.status(201).json({ success: true, message: 'Revaluation request submitted successfully', id });
});

// GET /api/examination/revaluation - View Revaluation Requests
router.get('/revaluation', authenticate, (req, res) => {
  let query = `
    SELECT r.*, s.full_name as student_name, s.roll_no, s.prn,
           e.name as exam_name, sub.name as subject_name, sub.code as subject_code
    FROM revaluation_requests r
    JOIN students s ON r.student_id = s.id
    JOIN examinations e ON r.examination_id = e.id
    JOIN courses_subjects sub ON r.subject_id = sub.id
  `;
  const params = [];

  if (req.user.role === 'STUDENT') {
    const s = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (s) {
      query += ' WHERE r.student_id = ?';
      params.push(s.id);
    }
  }

  query += ' ORDER BY r.applied_at DESC';
  const requests = db.prepare(query).all(...params);
  res.json({ requests });
});

// PUT /api/examination/revaluation/:id/review - Review Revaluation & Update Marks
router.put('/revaluation/:id/review', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { status, revised_marks, evaluator_remarks } = req.body;
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ACCEPTED or REJECTED' });
  }

  const rev = db.prepare('SELECT * FROM revaluation_requests WHERE id = ?').get(req.params.id);
  if (!rev) return res.status(404).json({ error: 'Revaluation request not found' });

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE revaluation_requests
      SET status = ?, revised_marks = ?, evaluator_remarks = ?
      WHERE id = ?
    `).run(status, revised_marks !== undefined ? Number(revised_marks) : null, evaluator_remarks || null, req.params.id);

    // If accepted and revised marks provided, update the actual marks entry!
    if (status === 'ACCEPTED' && revised_marks !== undefined) {
      const exam = db.prepare('SELECT max_marks FROM examinations WHERE id = ?').get(rev.examination_id);
      const pct = (Number(revised_marks) / (exam ? exam.max_marks : 100)) * 100;
      const { grade_letter, grade_point } = calculateGrade(pct);

      db.prepare(`
        UPDATE marks_entries
        SET marks_obtained = ?, grade_letter = ?, grade_point = ?
        WHERE id = ?
      `).run(Number(revised_marks), grade_letter, grade_point, rev.marks_entry_id);
    }
  });

  tx();

  res.json({ success: true, message: `Revaluation request ${status.toLowerCase()} and records synchronized.` });
});

module.exports = router;

