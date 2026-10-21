const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET, authenticate, logAudit } = require('../middleware/auth');

// Available demo users for role testing
const DEMO_USERS = [
  { role: 'SUPER_ADMIN', username: 'admin', label: 'Super Admin', name: 'Er. Sanjay Singhania', dept: 'Central Admin' },
  { role: 'PRINCIPAL', username: 'principal', label: 'Principal / Director', name: 'Dr. Anand M. Joshi', dept: 'Executive Office' },
  { role: 'HOD', username: 'hod_comp', label: 'HOD Computer Engg', name: 'Dr. Rajesh Sharma', dept: 'Computer Engineering' },
  { role: 'FACULTY', username: 'faculty_mehta', label: 'Faculty (Assoc. Prof)', name: 'Prof. Priya Mehta', dept: 'Computer Engineering' },
  { role: 'STUDENT', username: 'stud_aarav', label: 'Student (Merit)', name: 'Aarav Sharma (PRN 0045)', dept: 'Computer Engg (Sem 5)' },
  { role: 'STUDENT', username: 'stud_rohan', label: 'Student (At-Risk / Dues)', name: 'Rohan Verma (PRN 0078)', dept: 'Computer Engg (Sem 5)' },
  { role: 'ACCOUNTANT', username: 'accountant', label: 'Finance Officer', name: 'Suresh Kulkarni', dept: 'Accounts Section' },
  { role: 'LIBRARIAN', username: 'librarian', label: 'Chief Librarian', name: 'Sunita Shinde', dept: 'Central Library' },
  { role: 'PLACEMENT_OFFICER', username: 'tpo', label: 'Training & Placement Officer', name: 'Dr. Alok Mathur', dept: 'T&P Cell' }
];

// Helper to attach student or faculty specific record
const getLinkedProfile = (user) => {
  if (user.role === 'STUDENT') {
    const student = db.prepare(`
      SELECT s.*, d.name as department_name, d.code as department_code, sem.number as semester_number, div.name as division_name
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN semesters sem ON s.semester_id = sem.id
      LEFT JOIN divisions div ON s.division_id = div.id
      WHERE s.user_id = ?
    `).get(user.id);
    return { ...user, studentProfile: student || null };
  } else if (['FACULTY', 'HOD'].includes(user.role)) {
    const faculty = db.prepare(`
      SELECT f.*, d.name as department_name, d.code as department_code
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.user_id = ?
    `).get(user.id);
    return { ...user, facultyProfile: faculty || null };
  }
  return user;
};

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1').get(username, username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or inactive account' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user.id, user.role, 'USER_LOGIN', 'USER', user.id, 'Successful login', req);

  const safeUser = getLinkedProfile({
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    avatar_url: user.avatar_url,
    phone: user.phone
  });

  res.json({ token, user: safeUser });
});

// GET /api/auth/demo-users
router.get('/demo-users', (req, res) => {
  res.json({ demoUsers: DEMO_USERS });
});

// POST /api/auth/switch-demo (One-click instant persona switch for testing/demonstration)
router.post('/switch-demo', (req, res) => {
  const { username } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(404).json({ error: 'Demo user not found' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const safeUser = getLinkedProfile({
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    avatar_url: user.avatar_url,
    phone: user.phone
  });

  logAudit(user.id, user.role, 'DEMO_PERSONA_SWITCH', 'USER', user.id, `Switched persona to ${user.username} (${user.role})`, req);
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const userWithProfile = getLinkedProfile(req.user);
  res.json({ user: userWithProfile });
});

module.exports = router;
