const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/institution - Fetch full institution profile, academic years, depts
router.get('/', (req, res) => {
  const institution = db.prepare('SELECT * FROM institutions LIMIT 1').get();
  const departments = db.prepare('SELECT * FROM departments ORDER BY code ASC').all();
  const academicYears = db.prepare('SELECT * FROM academic_years ORDER BY is_current DESC, name DESC').all();
  const semesters = db.prepare('SELECT * FROM semesters ORDER BY number ASC').all();
  const divisions = db.prepare(`
    SELECT div.*, d.name as department_name, d.code as department_code, sem.number as semester_number
    FROM divisions div
    JOIN departments d ON div.department_id = d.id
    JOIN semesters sem ON div.semester_id = sem.id
    ORDER BY d.code, sem.number, div.name
  `).all();

  res.json({
    institution,
    departments,
    academicYears,
    semesters,
    divisions
  });
});

// PUT /api/institution - Update institution branding/profile
router.put('/', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  const { name, tagline, address, phone, email, website, naac_grade } = req.body;
  
  db.prepare(`
    UPDATE institutions 
    SET name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        naac_grade = COALESCE(?, naac_grade)
    WHERE id = 'inst-ait'
  `).run(name, tagline, address, phone, email, website, naac_grade);

  logAudit(req.user.id, req.user.role, 'UPDATE_INSTITUTION', 'INSTITUTION', 'inst-ait', req.body, req);

  const updated = db.prepare('SELECT * FROM institutions WHERE id = ' + "'inst-ait'").get();
  res.json({ success: true, institution: updated });
});

// POST /api/institution/departments - Add department
router.post('/departments', authenticate, authorize(['SUPER_ADMIN']), (req, res) => {
  const { code, name, hod_name, hod_email, intake_capacity, established_year } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Department code and name are required' });
  }

  const id = `dept-${code.toLowerCase()}`;
  db.prepare(`
    INSERT INTO departments (id, code, name, hod_name, hod_email, intake_capacity, established_year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, name, hod_name, hod_email, intake_capacity || 60, established_year || 2026);

  logAudit(req.user.id, req.user.role, 'CREATE_DEPARTMENT', 'DEPARTMENT', id, req.body, req);
  res.status(201).json({ success: true, department: { id, code, name, hod_name, hod_email, intake_capacity } });
});

module.exports = router;
