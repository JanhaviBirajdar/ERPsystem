const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/attendance/sessions - List attendance sessions
router.get('/sessions', authenticate, (req, res) => {
  const { division_id, subject_id, faculty_id, date } = req.query;

  let query = `
    SELECT ses.*, sub.code as subject_code, sub.name as subject_name,
           f.full_name as faculty_name, div.name as division_name,
           (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = ses.id AND r.status = 'PRESENT') as present_count,
           (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = ses.id) as total_students
    FROM attendance_sessions ses
    JOIN courses_subjects sub ON ses.subject_id = sub.id
    JOIN faculty f ON ses.faculty_id = f.id
    JOIN divisions div ON ses.division_id = div.id
    WHERE 1=1
  `;
  const params = [];

  if (division_id) {
    query += ' AND ses.division_id = ?';
    params.push(division_id);
  }
  if (subject_id) {
    query += ' AND ses.subject_id = ?';
    params.push(subject_id);
  }
  if (faculty_id) {
    query += ' AND ses.faculty_id = ?';
    params.push(faculty_id);
  }
  if (date) {
    query += ' AND ses.session_date = ?';
    params.push(date);
  }

  query += ' ORDER BY ses.session_date DESC, ses.created_at DESC';

  const sessions = db.prepare(query).all(...params);
  res.json({ sessions });
});

// POST /api/attendance/sessions - Create new session & generate dynamic anti-replay QR token
router.post('/sessions', authenticate, authorize(['SUPER_ADMIN', 'HOD', 'FACULTY']), (req, res) => {
  const { subject_id, division_id, session_date, time_slot, topic_covered, session_type, enable_qr } = req.body;

  if (!subject_id || !division_id || !session_date || !time_slot) {
    return res.status(400).json({ error: 'Missing required session fields' });
  }

  // Find faculty id for current user
  let faculty_id = req.body.faculty_id;
  if (!faculty_id) {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    faculty_id = fac ? fac.id : 'fac-mehta';
  }

  const sessionId = `att-ses-${Date.now()}`;
  let qrToken = null;
  let qrExpiresAt = null;

  if (enable_qr) {
    // Generate secure anti-replay token with 15 minute validity
    qrToken = `AIT-ATT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    qrExpiresAt = expires.toISOString().replace('T', ' ').substring(0, 19);
  }

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO attendance_sessions (id, subject_id, faculty_id, division_id, session_date, time_slot, topic_covered, session_type, qr_token, qr_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId, subject_id, faculty_id, division_id, session_date, time_slot,
      topic_covered || 'Standard Lecture Session', session_type || 'Lecture',
      qrToken, qrExpiresAt
    );

    // Pre-populate absent or unmarked records for all enrolled students in the division
    const students = db.prepare('SELECT id FROM students WHERE division_id = ?').all(division_id);
    const insertRec = db.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, status, marked_via)
      VALUES (?, ?, ?, 'ABSENT', 'MANUAL')
    `);
    for (const st of students) {
      insertRec.run(`rec-${sessionId}-${st.id}`, sessionId, st.id);
    }

    logAudit(req.user.id, req.user.role, 'CREATE_ATTENDANCE_SESSION', 'ATTENDANCE_SESSION', sessionId, { subject_id, division_id, enable_qr }, req);
  });

  tx();

  res.status(201).json({
    success: true,
    message: 'Attendance session created',
    session: { id: sessionId, qrToken, qrExpiresAt }
  });
});

// GET /api/attendance/sessions/:id - Get session with student records
router.get('/sessions/:id', authenticate, (req, res) => {
  const session = db.prepare(`
    SELECT ses.*, sub.code as subject_code, sub.name as subject_name,
           f.full_name as faculty_name, div.name as division_name
    FROM attendance_sessions ses
    JOIN courses_subjects sub ON ses.subject_id = sub.id
    JOIN faculty f ON ses.faculty_id = f.id
    JOIN divisions div ON ses.division_id = div.id
    WHERE ses.id = ?
  `).get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const records = db.prepare(`
    SELECT r.*, s.roll_no, s.full_name as student_name, s.prn, s.attendance_pct
    FROM attendance_records r
    JOIN students s ON r.student_id = s.id
    WHERE r.session_id = ?
    ORDER BY s.roll_no ASC
  `).all(session.id);

  res.json({ session, records });
});

// POST /api/attendance/mark - Mark attendance (Manual batch or QR scan)
router.post('/mark', authenticate, (req, res) => {
  const { session_id, student_id, status, marked_via, qr_token } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(session_id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // If marked via QR, perform anti-replay & expiration security checks
  if (marked_via === 'QR') {
    if (!session.qr_token || session.qr_token !== qr_token) {
      return res.status(400).json({ error: 'Invalid or expired QR attendance code' });
    }
    const now = new Date();
    const expiry = new Date(session.qr_expires_at);
    if (now > expiry) {
      return res.status(400).json({ error: 'Attendance QR code has expired' });
    }

    // Auto-detect student id if logged in as student
    let targetStudentId = student_id;
    if (req.user.role === 'STUDENT') {
      const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
      if (!st) return res.status(404).json({ error: 'Student profile not found' });
      targetStudentId = st.id;
    }

    db.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, status, marked_via, marked_at)
      VALUES (?, ?, ?, 'PRESENT', 'QR', CURRENT_TIMESTAMP)
      ON CONFLICT(session_id, student_id) DO UPDATE SET
        status = 'PRESENT',
        marked_via = 'QR',
        marked_at = CURRENT_TIMESTAMP
    `).run(`rec-${session_id}-${targetStudentId}`, session_id, targetStudentId);

    // Recalculate student overall attendance %
    updateStudentAttendanceCache(targetStudentId);

    return res.json({ success: true, message: 'QR attendance marked successfully as PRESENT' });
  }

  // Batch or single manual update by Faculty / Admin
  if (Array.isArray(req.body.records)) {
    const updateStmt = db.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, status, marked_via, marked_at)
      VALUES (?, ?, ?, ?, 'MANUAL', CURRENT_TIMESTAMP)
      ON CONFLICT(session_id, student_id) DO UPDATE SET
        status = excluded.status,
        marked_via = 'MANUAL',
        marked_at = CURRENT_TIMESTAMP
    `);

    const tx = db.transaction(() => {
      for (const rec of req.body.records) {
        updateStmt.run(`rec-${session_id}-${rec.student_id}`, session_id, rec.student_id, rec.status || 'PRESENT');
        updateStudentAttendanceCache(rec.student_id);
      }
    });
    tx();

    logAudit(req.user.id, req.user.role, 'UPDATE_ATTENDANCE_BATCH', 'ATTENDANCE_SESSION', session_id, { count: req.body.records.length }, req);
    return res.json({ success: true, message: `Updated attendance for ${req.body.records.length} students` });
  }

  // Single manual record
  db.prepare(`
    INSERT INTO attendance_records (id, session_id, student_id, status, marked_via, marked_at)
    VALUES (?, ?, ?, ?, 'MANUAL', CURRENT_TIMESTAMP)
    ON CONFLICT(session_id, student_id) DO UPDATE SET
      status = excluded.status,
      marked_via = 'MANUAL'
  `).run(`rec-${session_id}-${student_id}`, session_id, student_id, status || 'PRESENT');

  updateStudentAttendanceCache(student_id);
  res.json({ success: true, message: 'Attendance marked' });
});

// Helper function to update student's cached attendance percentage
function updateStudentAttendanceCache(studentId) {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_sessions,
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions
    FROM attendance_records
    WHERE student_id = ?
  `).get(studentId);

  if (stats && stats.total_sessions > 0) {
    const pct = Math.round((stats.present_sessions / stats.total_sessions) * 1000) / 10;
    db.prepare('UPDATE students SET attendance_pct = ? WHERE id = ?').run(pct, studentId);
  }
}

// GET /api/attendance/student/:studentId - Subject-wise attendance calculation
router.get('/student/:studentId', authenticate, (req, res) => {
  const student = db.prepare('SELECT id, full_name, prn, attendance_pct, division_id FROM students WHERE id = ?').get(req.params.studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const subjectBreakdown = db.prepare(`
    SELECT 
      sub.id as subject_id,
      sub.code as subject_code,
      sub.name as subject_name,
      COUNT(ses.id) as total_conducted,
      SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as attended,
      ROUND(CAST(SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(ses.id), 1) * 100, 1) as percentage
    FROM attendance_sessions ses
    JOIN courses_subjects sub ON ses.subject_id = sub.id
    LEFT JOIN attendance_records ar ON ar.session_id = ses.id AND ar.student_id = ?
    WHERE ses.division_id = ?
    GROUP BY sub.id
  `).all(student.id, student.division_id);

  res.json({
    student,
    overall_attendance: student.attendance_pct,
    is_defaulter: student.attendance_pct < 75.0,
    breakdown: subjectBreakdown
  });
});

// GET /api/attendance/shortage-report - Defaulter list (< 75% attendance)
router.get('/shortage-report', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), (req, res) => {
  const { department_id, threshold = 75 } = req.query;

  let query = `
    SELECT s.id, s.prn, s.roll_no, s.full_name, s.email, s.phone, s.attendance_pct,
           d.name as department_name, d.code as department_code,
           s.guardian_name, s.guardian_phone
    FROM students s
    JOIN departments d ON s.department_id = d.id
    WHERE s.attendance_pct < ?
  `;
  const params = [parseFloat(threshold)];

  if (department_id) {
    query += ' AND s.department_id = ?';
    params.push(department_id);
  }

  query += ' ORDER BY s.attendance_pct ASC';

  const defaulters = db.prepare(query).all(...params);
  res.json({ count: defaulters.length, threshold: parseFloat(threshold), defaulters });
});

module.exports = router;
