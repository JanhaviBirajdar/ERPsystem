const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/faculty - Faculty directory
router.get('/', authenticate, (req, res) => {
  const { department_id, search } = req.query;

  let query = `
    SELECT f.*, d.name as department_name, d.code as department_code,
           u.avatar_url, u.username
    FROM faculty f
    JOIN departments d ON f.department_id = d.id
    LEFT JOIN users u ON f.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (department_id) {
    query += ' AND f.department_id = ?';
    params.push(department_id);
  }

  if (search) {
    query += ' AND (f.full_name LIKE ? OR f.emp_code LIKE ? OR f.email LIKE ? OR f.specialization LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY f.emp_code ASC';

  const faculty = db.prepare(query).all(...params);

  // Attach allocated subjects for each faculty
  const getSubjects = db.prepare(`
    SELECT sa.id as alloc_id, sub.code, sub.name, div.name as division_name
    FROM subject_allocations sa
    JOIN courses_subjects sub ON sa.subject_id = sub.id
    JOIN divisions div ON sa.division_id = div.id
    WHERE sa.faculty_id = ?
  `);

  const enriched = faculty.map(fac => ({
    ...fac,
    allocatedSubjects: getSubjects.all(fac.id)
  }));

  res.json({ count: enriched.length, faculty: enriched });
});

// GET /api/faculty/:id - Faculty details with timetable
router.get('/:id', authenticate, (req, res) => {
  const fac = db.prepare(`
    SELECT f.*, d.name as department_name, d.code as department_code,
           u.avatar_url, u.username
    FROM faculty f
    JOIN departments d ON f.department_id = d.id
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.id = ? OR f.user_id = ?
  `).get(req.params.id, req.params.id);

  if (!fac) {
    return res.status(404).json({ error: 'Faculty member not found' });
  }

  const subjects = db.prepare(`
    SELECT sa.id as alloc_id, sub.code, sub.name, sub.credits, div.name as division_name, div.id as division_id
    FROM subject_allocations sa
    JOIN courses_subjects sub ON sa.subject_id = sub.id
    JOIN divisions div ON sa.division_id = div.id
    WHERE sa.faculty_id = ?
  `).all(fac.id);

  const timetable = db.prepare(`
    SELECT tt.*, sub.code as subject_code, sub.name as subject_name, div.name as division_name
    FROM timetables tt
    JOIN courses_subjects sub ON tt.subject_id = sub.id
    JOIN divisions div ON tt.division_id = div.id
    WHERE tt.faculty_id = ?
    ORDER BY CASE tt.day_of_week
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
      ELSE 7 END, tt.time_slot
  `).all(fac.id);

  res.json({ faculty: fac, subjects, timetable });
});

// POST /api/faculty - Register new faculty
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  const { full_name, designation, department_id, qualification, specialization, experience_years, email, phone, joining_date, weekly_workload_hours } = req.body;

  if (!full_name || !email || !department_id || !designation) {
    return res.status(400).json({ error: 'Missing required faculty fields' });
  }

  const dept = db.prepare('SELECT code FROM departments WHERE id = ?').get(department_id);
  const count = db.prepare('SELECT COUNT(*) as c FROM faculty WHERE department_id = ?').get(department_id).c + 1;
  const emp_code = `FAC-${dept ? dept.code : 'ENG'}-${String(count).padStart(3, '0')}`;
  const facId = `fac-${Date.now()}`;
  const userId = `usr-${facId}`;
  const username = `fac_${emp_code.toLowerCase().replace(/-/g, '_')}`;
  const defaultPassword = 'faculty123';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, email, role, department_id, phone, avatar_url)
      VALUES (?, ?, ?, ?, ?, 'FACULTY', ?, ?, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')
    `).run(userId, username, passwordHash, full_name, email, department_id, phone);

    db.prepare(`
      INSERT INTO faculty (id, user_id, emp_code, full_name, designation, department_id, qualification, specialization, experience_years, email, phone, joining_date, weekly_workload_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      facId, userId, emp_code, full_name, designation, department_id, qualification, specialization,
      experience_years || 1, email, phone, joining_date || new Date().toISOString().split('T')[0],
      weekly_workload_hours || 16
    );

    logAudit(req.user.id, req.user.role, 'CREATE_FACULTY', 'FACULTY', facId, { emp_code, full_name, department_id }, req);
  });

  tx();

  res.status(201).json({
    success: true,
    message: 'Faculty registered successfully',
    faculty: { id: facId, emp_code, full_name, username, defaultPassword }
  });
});

// PUT /api/faculty/:id/department - Department reallocation
router.put('/:id/department', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { department_id } = req.body;
  if (!department_id) return res.status(400).json({ error: 'department_id is required' });

  const fac = db.prepare('SELECT * FROM faculty WHERE id = ?').get(req.params.id);
  if (!fac) return res.status(404).json({ error: 'Faculty member not found' });

  db.prepare('UPDATE faculty SET department_id = ? WHERE id = ?').run(department_id, req.params.id);
  db.prepare('UPDATE users SET department_id = ? WHERE id = ?').run(department_id, fac.user_id);

  logAudit(req.user.id, req.user.role, 'REALLOCATE_FACULTY_DEPT', 'FACULTY', req.params.id, { oldDept: fac.department_id, newDept: department_id }, req);

  res.json({ success: true, message: 'Faculty department reallocated successfully' });
});

// POST /api/faculty/:id/subject-allocations - Allocate Subject
router.post('/:id/subject-allocations', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { subject_id, division_id } = req.body;
  if (!subject_id || !division_id) {
    return res.status(400).json({ error: 'subject_id and division_id are required' });
  }

  const ay = db.prepare('SELECT id FROM academic_years ORDER BY start_date DESC LIMIT 1').get();
  const ayId = req.body.academic_year_id || (ay ? ay.id : 'ay-2026-27');

  const allocId = `alloc-${Date.now()}`;
  db.prepare(`
    INSERT INTO subject_allocations (id, subject_id, faculty_id, division_id, academic_year_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(allocId, subject_id, req.params.id, division_id, ayId);

  res.status(201).json({ success: true, message: 'Subject allocated to faculty successfully', id: allocId });
});

// DELETE /api/faculty/subject-allocations/:allocId - Remove Subject Allocation
router.delete('/subject-allocations/:allocId', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  db.prepare('DELETE FROM subject_allocations WHERE id = ?').run(req.params.allocId);
  res.json({ success: true, message: 'Subject allocation removed' });
});

// POST /api/faculty/leaves - Apply for leave
router.post('/leaves', authenticate, (req, res) => {
  const { faculty_id, leave_type = 'CASUAL', start_date, end_date, days_count, reason } = req.body;
  if (!start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'start_date, end_date, and reason are required' });
  }

  // Resolve faculty ID if applied by logged in faculty user
  let facId = faculty_id;
  if (!facId) {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) facId = fac.id;
  }
  if (!facId) return res.status(400).json({ error: 'Could not resolve faculty profile for leave request' });

  const id = `lv-${Date.now()}`;
  db.prepare(`
    INSERT INTO faculty_leaves (id, faculty_id, leave_type, start_date, end_date, days_count, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(id, facId, leave_type, start_date, end_date, Number(days_count || 1), reason);

  res.status(201).json({ success: true, message: 'Leave request submitted successfully', id });
});

// GET /api/faculty/leaves - Get leave requests
router.get('/leaves', authenticate, (req, res) => {
  let query = `
    SELECT l.*, f.full_name as faculty_name, f.emp_code, d.name as department_name
    FROM faculty_leaves l
    JOIN faculty f ON l.faculty_id = f.id
    JOIN departments d ON f.department_id = d.id
  `;
  const params = [];

  if (req.user.role === 'FACULTY') {
    query += ` WHERE f.user_id = ?`;
    params.push(req.user.id);
  }

  query += ` ORDER BY l.applied_at DESC`;
  const leaves = db.prepare(query).all(...params);

  res.json({ leaves });
});

// PUT /api/faculty/leaves/:id/status - Approve or reject leave
router.put('/leaves/:id/status', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { status, rejection_reason } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
  }

  db.prepare(`
    UPDATE faculty_leaves
    SET status = ?, approved_by = ?, rejection_reason = ?
    WHERE id = ?
  `).run(status, req.user.id, rejection_reason || null, req.params.id);

  res.json({ success: true, message: `Leave request ${status.toLowerCase()} successfully` });
});

// GET /api/faculty/workload/overview - Calculate faculty workload analytics
router.get('/workload/overview', authenticate, (req, res) => {
  const faculty = db.prepare(`
    SELECT f.id, f.emp_code, f.full_name, f.designation, f.weekly_workload_hours as max_allowed_hours,
           d.name as department_name, d.code as department_code,
           COUNT(DISTINCT tt.id) as scheduled_lecture_hours,
           COUNT(DISTINCT sa.id) as allocated_subjects_count
    FROM faculty f
    JOIN departments d ON f.department_id = d.id
    LEFT JOIN timetables tt ON f.id = tt.faculty_id
    LEFT JOIN subject_allocations sa ON f.id = sa.faculty_id
    GROUP BY f.id
    ORDER BY scheduled_lecture_hours DESC
  `).all();

  res.json({ workloadOverview: faculty });
});

module.exports = router;

