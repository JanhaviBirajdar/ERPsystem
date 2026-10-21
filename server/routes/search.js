const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/search - Universal Search across college records
router.get('/', authenticate, (req, res) => {
  const query = req.query.q ? req.query.q.trim() : '';
  if (!query || query.length < 2) {
    return res.json({ results: { students: [], faculty: [], subjects: [], notices: [], tickets: [] } });
  }

  const term = `%${query}%`;
  const isStaff = ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'ACCOUNTANT'].includes(req.user.role);

  // 1. Search Students
  const students = db.prepare(`
    SELECT s.id, s.full_name as title, s.prn as subtitle, 'Student' as type, s.roll_no,
           d.code as department_code, s.attendance_pct, s.current_cgpa
    FROM students s
    JOIN departments d ON s.department_id = d.id
    WHERE s.full_name LIKE ? OR s.prn LIKE ? OR s.roll_no LIKE ? OR s.email LIKE ?
    LIMIT 5
  `).all(term, term, term, term);

  // 2. Search Faculty
  const faculty = db.prepare(`
    SELECT f.id, f.full_name as title, f.designation as subtitle, 'Faculty' as type,
           f.emp_code, d.code as department_code, f.specialization
    FROM faculty f
    JOIN departments d ON f.department_id = d.id
    WHERE f.full_name LIKE ? OR f.emp_code LIKE ? OR f.specialization LIKE ? OR f.email LIKE ?
    LIMIT 5
  `).all(term, term, term, term);

  // 3. Search Courses / Subjects
  const subjects = db.prepare(`
    SELECT sub.id, sub.name as title, sub.code as subtitle, 'Course' as type,
           sub.credits, d.code as department_code, sub.syllabus_completed_pct
    FROM courses_subjects sub
    JOIN departments d ON sub.department_id = d.id
    WHERE sub.name LIKE ? OR sub.code LIKE ?
    LIMIT 5
  `).all(term, term);

  // 4. Search Notices
  const notices = db.prepare(`
    SELECT n.id, n.title, n.category as subtitle, 'Notice' as type,
           n.publish_date, n.target_audience
    FROM notices n
    WHERE n.title LIKE ? OR n.content LIKE ?
    LIMIT 5
  `).all(term, term);

  // 5. Search Tickets (Role Restricted)
  let tickets = [];
  if (isStaff) {
    tickets = db.prepare(`
      SELECT t.id, t.title, t.ticket_no as subtitle, 'Service Desk' as type,
             t.status, t.category, s.full_name as student_name
      FROM service_desk_tickets t
      JOIN students s ON t.student_id = s.id
      WHERE t.ticket_no LIKE ? OR t.title LIKE ? OR t.description LIKE ?
      LIMIT 5
    `).all(term, term, term);
  } else if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (st) {
      tickets = db.prepare(`
        SELECT t.id, t.title, t.ticket_no as subtitle, 'Service Desk' as type,
               t.status, t.category
        FROM service_desk_tickets t
        WHERE t.student_id = ? AND (t.ticket_no LIKE ? OR t.title LIKE ?)
        LIMIT 5
      `).all(st.id, term, term);
    }
  }

  res.json({
    results: {
      students,
      faculty,
      subjects,
      notices,
      tickets
    }
  });
});

module.exports = router;
