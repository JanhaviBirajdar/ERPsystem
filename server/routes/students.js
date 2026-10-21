const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/students - Filterable student directory
router.get('/', authenticate, (req, res) => {
  const { department_id, semester_id, division_id, category, search, below_attendance } = req.query;

  let query = `
    SELECT s.*, d.name as department_name, d.code as department_code, 
           sem.number as semester_number, div.name as division_name,
           u.avatar_url
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN semesters sem ON s.semester_id = sem.id
    LEFT JOIN divisions div ON s.division_id = div.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Role scoping: If HOD or Faculty from specific department, default scope
  if (['HOD'].includes(req.user.role) && req.user.department_id) {
    query += ' AND s.department_id = ?';
    params.push(req.user.department_id);
  } else if (department_id) {
    query += ' AND s.department_id = ?';
    params.push(department_id);
  }

  if (semester_id) {
    query += ' AND s.semester_id = ?';
    params.push(semester_id);
  }

  if (division_id) {
    query += ' AND s.division_id = ?';
    params.push(division_id);
  }

  if (category) {
    query += ' AND s.category = ?';
    params.push(category);
  }

  if (below_attendance) {
    query += ' AND s.attendance_pct < ?';
    params.push(parseFloat(below_attendance));
  }

  if (search) {
    query += ' AND (s.full_name LIKE ? OR s.prn LIKE ? OR s.roll_no LIKE ? OR s.email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY s.roll_no ASC';

  const students = db.prepare(query).all(...params);
  res.json({ count: students.length, students });
});

// GET /api/students/:id - 360-degree Student Profile
router.get('/:id', authenticate, (req, res) => {
  const student = db.prepare(`
    SELECT s.*, d.name as department_name, d.code as department_code, 
           sem.number as semester_number, div.name as division_name,
           u.avatar_url, u.username
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN semesters sem ON s.semester_id = sem.id
    LEFT JOIN divisions div ON s.division_id = div.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ? OR s.user_id = ?
  `).get(req.params.id, req.params.id);

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Student role security: student can only view own profile
  if (req.user.role === 'STUDENT' && req.user.id !== student.user_id) {
    return res.status(403).json({ error: 'Unauthorized to view another student profile' });
  }

  // Related data: Invoices, Marks, Attendance, Library, Applications
  const invoices = db.prepare('SELECT * FROM student_invoices WHERE student_id = ?').all(student.id);
  const payments = db.prepare('SELECT * FROM fee_payments WHERE student_id = ? ORDER BY payment_date DESC').all(student.id);
  const marks = db.prepare(`
    SELECT m.*, e.name as exam_name, e.exam_type, e.max_marks, sub.name as subject_name, sub.code as subject_code
    FROM marks_entries m
    JOIN examinations e ON m.examination_id = e.id
    JOIN courses_subjects sub ON m.subject_id = sub.id
    WHERE m.student_id = ?
  `).all(student.id);
  const bookLoans = db.prepare(`
    SELECT bi.*, b.title, b.author, b.isbn
    FROM book_issues bi
    JOIN library_books b ON bi.book_id = b.id
    WHERE bi.student_id = ?
    ORDER BY bi.issue_date DESC
  `).all(student.id);
  const placementApps = db.prepare(`
    SELECT pa.*, pd.company_name, pd.role_title, pd.ctc_lpa, pd.drive_date
    FROM placement_applications pa
    JOIN placement_drives pd ON pa.drive_id = pd.id
    WHERE pa.student_id = ?
  `).all(student.id);
  const serviceTickets = db.prepare('SELECT * FROM service_desk_tickets WHERE student_id = ? ORDER BY created_at DESC').all(student.id);
  const alerts = db.prepare('SELECT * FROM early_warning_alerts WHERE student_id = ?').all(student.id);

  res.json({
    student,
    invoices,
    payments,
    marks,
    bookLoans,
    placementApps,
    serviceTickets,
    alerts
  });
});

// POST /api/students - Enroll New Student
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const {
    full_name, email, phone, gender, dob, category, department_id, semester_id, division_id,
    guardian_name, guardian_phone, guardian_email, guardian_relation, address, blood_group, abc_id
  } = req.body;

  if (!full_name || !email || !department_id || !semester_id) {
    return res.status(400).json({ error: 'Missing required student enrollment fields' });
  }

  const dept = db.prepare('SELECT code FROM departments WHERE id = ?').get(department_id);
  const currentYear = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM students WHERE department_id = ?').get(department_id).c + 1;
  
  const prn = `${currentYear}${dept ? dept.code : 'ENG'}${String(count).padStart(4, '0')}`;
  const roll_no = `42${String(count).padStart(2, '0')}`;
  const studentId = `stud-${Date.now()}`;
  const userId = `usr-${studentId}`;
  const username = `stud_${prn.toLowerCase()}`;
  const defaultPassword = 'student123';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  const tx = db.transaction(() => {
    // 1. Create User
    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, email, role, department_id, phone, avatar_url)
      VALUES (?, ?, ?, ?, ?, 'STUDENT', ?, ?, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
    `).run(userId, username, passwordHash, full_name, email, department_id, phone);

    // 2. Create Student
    db.prepare(`
      INSERT INTO students (
        id, user_id, prn, roll_no, full_name, email, phone, gender, dob, category,
        department_id, semester_id, division_id, admission_year, guardian_name,
        guardian_phone, guardian_email, guardian_relation, address, blood_group, abc_id,
        current_cgpa, attendance_pct
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 100.0)
    `).run(
      studentId, userId, prn, roll_no, full_name, email, phone, gender || 'Other', dob || '2005-01-01',
      category || 'OPEN', department_id, semester_id, division_id || null, currentYear,
      guardian_name, guardian_phone, guardian_email, guardian_relation || 'Parent',
      address, blood_group, abc_id
    );

    // 3. Automatically generate fee invoice based on category
    const feeCategoryMap = {
      'OPEN': 'cat-open',
      'OBC': 'cat-obc',
      'SC': 'cat-scst',
      'ST': 'cat-scst',
      'TFWS': 'cat-tfws'
    };
    const catId = feeCategoryMap[category] || 'cat-open';
    const feeStruct = db.prepare(`
      SELECT total_annual_fee FROM fee_structures 
      WHERE department_id = ? AND fee_category_id = ?
    `).get(department_id, catId) || { total_annual_fee: 120000 };

    const invId = `inv-${studentId}`;
    const invNumber = `INV-${currentYear}-${String(count).padStart(4, '0')}`;
    db.prepare(`
      INSERT INTO student_invoices (id, invoice_number, student_id, academic_year_id, total_amount, concession_amount, paid_amount, balance_amount, status, due_date)
      VALUES (?, ?, ?, 'ay-2026-27', ?, 0, 0, ?, 'PENDING', '2026-11-30')
    `).run(invId, invNumber, studentId, feeStruct.total_annual_fee, feeStruct.total_annual_fee);

    logAudit(req.user.id, req.user.role, 'ENROLL_STUDENT', 'STUDENT', studentId, { prn, roll_no, full_name, department_id }, req);
  });

  tx();

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully and credential account generated',
    student: { id: studentId, prn, roll_no, full_name, username, defaultPassword }
  });
});

// PUT /api/students/:id - Update student details
router.put('/:id', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { full_name, phone, guardian_name, guardian_phone, address, blood_group, current_cgpa } = req.body;
  
  db.prepare(`
    UPDATE students
    SET full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        guardian_name = COALESCE(?, guardian_name),
        guardian_phone = COALESCE(?, guardian_phone),
        address = COALESCE(?, address),
        blood_group = COALESCE(?, blood_group),
        current_cgpa = COALESCE(?, current_cgpa)
    WHERE id = ?
  `).run(full_name, phone, guardian_name, guardian_phone, address, blood_group, current_cgpa, req.params.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_STUDENT', 'STUDENT', req.params.id, req.body, req);
  res.json({ success: true, message: 'Student updated successfully' });
});

module.exports = router;
