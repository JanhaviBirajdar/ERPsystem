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

module.exports = router;
