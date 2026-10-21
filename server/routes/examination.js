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

module.exports = router;
