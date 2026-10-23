const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// Ensure search audit log table exists for security metadata telemetry
db.exec(`
  CREATE TABLE IF NOT EXISTS search_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_role TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    execution_time_ms REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_search_audit_user ON search_audit_logs(user_id, created_at);
`);

/**
 * Treat retrieved records as untrusted data.
 * Sanitize strings to neutralize XSS, script injection, and template delimiter payloads.
 */
function sanitize(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\{\{/g, '&#123;&#123;')
    .replace(/\}\}/g, '&#125;&#125;');
}

function sanitizeRecord(rec) {
  if (!rec || typeof rec !== 'object') return rec;
  const sanitized = {};
  for (const [key, val] of Object.entries(rec)) {
    if (typeof val === 'string') {
      sanitized[key] = sanitize(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

// GET /api/search - Role-Scoped Intelligent Search across college records
router.get('/', authenticate, (req, res) => {
  const startTime = Date.now();
  const rawQuery = req.query.q ? req.query.q.trim() : '';

  if (!rawQuery || rawQuery.length < 2) {
    return res.json({
      query: '',
      results: { students: [], faculty: [], subjects: [], notices: [], tickets: [], requests: [] },
      meta: { totalResults: 0, roleScoped: true, sanitized: true }
    });
  }

  // Pre-retrieval length and injection sanitization
  const safeQuery = rawQuery.slice(0, 100);
  const term = `%${safeQuery}%`;
  const role = req.user.role;
  const isStaff = ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'ACCOUNTANT'].includes(role);

  // Identify student record if current user is a student
  let currentStudentId = null;
  if (role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (st) currentStudentId = st.id;
  }

  // 1. Search Students with Role-Based Field Redaction
  // Staff see full academic metrics (attendance, CGPA); Students searching peer directory have metrics redacted
  let students = [];
  if (isStaff) {
    students = db.prepare(`
      SELECT s.id, s.full_name as title, s.prn as subtitle, 'Student' as type, s.roll_no,
             d.code as department_code, d.name as department_name,
             s.attendance_pct, s.current_cgpa
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.full_name LIKE ? OR s.prn LIKE ? OR s.roll_no LIKE ? OR s.email LIKE ?
      LIMIT 5
    `).all(term, term, term, term);
  } else {
    // Peer Student Access: Mask confidential attendance and CGPA of peers
    students = db.prepare(`
      SELECT s.id, s.full_name as title, s.prn as subtitle, 'Student' as type, s.roll_no,
             d.code as department_code, d.name as department_name,
             CASE WHEN s.id = ? THEN s.attendance_pct ELSE NULL END as attendance_pct,
             CASE WHEN s.id = ? THEN s.current_cgpa ELSE NULL END as current_cgpa
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.full_name LIKE ? OR s.prn LIKE ? OR s.roll_no LIKE ?
      LIMIT 5
    `).all(currentStudentId || '', currentStudentId || '', term, term, term);
  }

  // 2. Search Faculty
  const faculty = db.prepare(`
    SELECT f.id, f.full_name as title, f.designation as subtitle, 'Faculty' as type,
           f.emp_code, d.code as department_code, d.name as department_name, f.specialization
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

  // 4. Search Notices with Pre-Retrieval Audience Permissions
  let noticesQuery = "SELECT n.id, n.title, n.category as subtitle, 'Notice' as type, n.publish_date, n.target_audience FROM notices n WHERE (n.title LIKE ? OR n.content LIKE ?)";
  const noticesParams = [term, term];

  if (role === 'STUDENT') {
    // Students only retrieve notices marked ALL or STUDENTS
    noticesQuery += " AND (n.target_audience = 'ALL' OR n.target_audience = 'STUDENTS')";
  } else if (role === 'FACULTY') {
    // Faculty retrieve notices marked ALL or FACULTY
    noticesQuery += " AND (n.target_audience = 'ALL' OR n.target_audience = 'FACULTY')";
  }
  // HOD, PRINCIPAL, SUPER_ADMIN can retrieve all internal circulars
  noticesQuery += ' ORDER BY n.is_pinned DESC, n.publish_date DESC LIMIT 5';
  const notices = db.prepare(noticesQuery).all(...noticesParams);

  // 5. Search Service Desk Tickets with Strict Role Scoping
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
  } else if (currentStudentId) {
    tickets = db.prepare(`
      SELECT t.id, t.title, t.ticket_no as subtitle, 'Service Desk' as type,
             t.status, t.category
      FROM service_desk_tickets t
      WHERE t.student_id = ? AND (t.ticket_no LIKE ? OR t.title LIKE ? OR t.description LIKE ?)
      LIMIT 5
    `).all(currentStudentId, term, term, term);
  }

  // 6. Search Workflow Instances & Self-Service Requests with Role Scoping
  let requests = [];
  if (['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(role)) {
    requests = db.prepare(`
      SELECT w.id, w.title, w.domain as subtitle, 'Workflow Request' as type,
             w.status, w.requester_name, w.current_assigned_role, w.created_at
      FROM workflow_instances w
      WHERE w.title LIKE ? OR w.id LIKE ? OR w.requester_name LIKE ?
      LIMIT 5
    `).all(term, term, term);
  } else if (role === 'FACULTY') {
    requests = db.prepare(`
      SELECT w.id, w.title, w.domain as subtitle, 'Workflow Request' as type,
             w.status, w.requester_name, w.current_assigned_role, w.created_at
      FROM workflow_instances w
      WHERE (w.requester_id = ? OR w.current_assigned_role = 'FACULTY')
        AND (w.title LIKE ? OR w.id LIKE ?)
      LIMIT 5
    `).all(req.user.id, term, term);
  } else if (role === 'STUDENT') {
    requests = db.prepare(`
      SELECT w.id, w.title, w.domain as subtitle, 'Workflow Request' as type,
             w.status, w.current_assigned_role, w.created_at
      FROM workflow_instances w
      WHERE (w.requester_id = ? OR w.requester_id = ?) AND (w.title LIKE ? OR w.id LIKE ?)
      LIMIT 5
    `).all(req.user.id, currentStudentId || '', term, term);
  }

  // Treat retrieved documents as untrusted data: sanitize all string fields
  const sanitizedResults = {
    students: students.map(sanitizeRecord),
    faculty: faculty.map(sanitizeRecord),
    subjects: subjects.map(sanitizeRecord),
    notices: notices.map(sanitizeRecord),
    tickets: tickets.map(sanitizeRecord),
    requests: requests.map(sanitizeRecord)
  };

  const totalResults =
    sanitizedResults.students.length +
    sanitizedResults.faculty.length +
    sanitizedResults.subjects.length +
    sanitizedResults.notices.length +
    sanitizedResults.tickets.length +
    sanitizedResults.requests.length;

  const executionTimeMs = Date.now() - startTime;

  // Log usage telemetry without storing raw sensitive query strings
  try {
    const logId = `slog-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO search_audit_logs (id, user_id, user_role, results_count, execution_time_ms)
      VALUES (?, ?, ?, ?, ?)
    `).run(logId, req.user.id, role, totalResults, executionTimeMs);
  } catch (err) {
    // Non-blocking telemetry log
  }

  res.json({
    query: sanitize(safeQuery),
    results: sanitizedResults,
    meta: {
      totalResults,
      roleScoped: true,
      sanitized: true,
      executionTimeMs
    }
  });
});

module.exports = router;
