const db = require('../db/database');
const bcrypt = require('bcryptjs');

// 1. Get all applications with search, status, and department filters
exports.getApplications = (req, res) => {
  try {
    const { department_id, status, category, search, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT a.*, d.name as department_name, d.code as department_code
      FROM admissions_applications a
      JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (department_id) {
      query += ` AND a.department_id = ?`;
      params.push(department_id);
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    if (category) {
      query += ` AND a.category = ?`;
      params.push(category);
    }
    if (search) {
      query += ` AND (a.candidate_name LIKE ? OR a.application_no LIKE ? OR a.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const applications = db.prepare(query).all(...params);

    const totalCountQuery = `
      SELECT COUNT(*) as count 
      FROM admissions_applications a 
      WHERE 1=1
      ${department_id ? ' AND a.department_id = ?' : ''}
      ${status ? ' AND a.status = ?' : ''}
      ${category ? ' AND a.category = ?' : ''}
      ${search ? ' AND (a.candidate_name LIKE ? OR a.application_no LIKE ? OR a.email LIKE ?)' : ''}
    `;
    const countParams = [];
    if (department_id) countParams.push(department_id);
    if (status) countParams.push(status);
    if (category) countParams.push(category);
    if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);

    const total = db.prepare(totalCountQuery).get(...countParams).count;

    res.json({
      applications: applications.map(app => ({
        ...app,
        documents: app.documents_json ? JSON.parse(app.documents_json) : []
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch applications: ${err.message}` });
  }
};

// 2. Submit new application
exports.createApplication = (req, res) => {
  try {
    const {
      candidate_name, email, phone, category = 'OPEN',
      entrance_exam = 'MHT-CET', entrance_score, entrance_rank,
      department_id, tenth_pct, twelfth_pct
    } = req.body;

    if (!candidate_name || !email || !phone || !department_id || entrance_score === undefined || tenth_pct === undefined || twelfth_pct === undefined) {
      return res.status(400).json({ error: 'Missing required admission application fields' });
    }

    const appCount = db.prepare('SELECT COUNT(*) as c FROM admissions_applications').get().c + 1;
    const application_no = `APP-2026-${String(appCount).padStart(4, '0')}`;
    const id = `adm-${Date.now()}`;

    const defaultDocs = [
      { name: '10th Marksheet', verified: false },
      { name: '12th Marksheet', verified: false },
      { name: `${entrance_exam} Scorecard`, verified: false },
      { name: 'Domicile / Nationality Certificate', verified: false }
    ];
    if (category !== 'OPEN') {
      defaultDocs.push({ name: 'Caste & Non-Creamy Layer Certificate', verified: false });
    }

    db.prepare(`
      INSERT INTO admissions_applications (
        id, application_no, candidate_name, email, phone, category,
        entrance_exam, entrance_score, entrance_rank, department_id,
        tenth_pct, twelfth_pct, status, documents_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPLIED', ?)
    `).run(
      id, application_no, candidate_name, email, phone, category,
      entrance_exam, Number(entrance_score), Number(entrance_rank || 0),
      department_id, Number(tenth_pct), Number(twelfth_pct), JSON.stringify(defaultDocs)
    );

    const created = db.prepare('SELECT * FROM admissions_applications WHERE id = ?').get(id);
    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        ...created,
        documents: JSON.parse(created.documents_json)
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Application submission failed: ${err.message}` });
  }
};

// 3. Document Verification
exports.verifyDocuments = (req, res) => {
  try {
    const { id } = req.params;
    const { verified_documents, notes } = req.body; // array of doc names e.g. ['10th Marksheet', '12th Marksheet']

    const app = db.prepare('SELECT * FROM admissions_applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    let existingDocs = app.documents_json ? JSON.parse(app.documents_json) : [];
    if (Array.isArray(verified_documents)) {
      existingDocs = existingDocs.map(d => ({
        ...d,
        verified: verified_documents.includes(d.name)
      }));
    }

    const allVerified = existingDocs.length > 0 && existingDocs.every(d => d.verified);
    const newStatus = allVerified ? 'DOCS_VERIFIED' : 'APPLIED';

    db.prepare(`
      UPDATE admissions_applications
      SET documents_json = ?, verification_notes = ?, status = ?
      WHERE id = ?
    `).run(JSON.stringify(existingDocs), notes || 'Documents verified by Admission Officer', newStatus, id);

    res.json({
      message: allVerified ? 'All documents verified successfully' : 'Document status updated',
      status: newStatus,
      documents: existingDocs
    });
  } catch (err) {
    res.status(500).json({ error: `Document verification failed: ${err.message}` });
  }
};

// 4. Check Eligibility
exports.checkEligibility = (req, res) => {
  try {
    const { id } = req.params;
    const app = db.prepare('SELECT * FROM admissions_applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Criteria: 12th >= 45% for Reserved, >= 50% for OPEN, entrance score > 0
    const min12th = app.category === 'OPEN' ? 50 : 45;
    const isEligible = app.twelfth_pct >= min12th && app.entrance_score > 0;

    const newStatus = isEligible ? 'ELIGIBLE' : 'REJECTED';
    const notes = isEligible 
      ? `Eligible: 12th percentage ${app.twelfth_pct}% >= ${min12th}% and CET score ${app.entrance_score}`
      : `Ineligible: Does not meet minimum cutoff (${min12th}% required in 12th)`;

    db.prepare(`
      UPDATE admissions_applications
      SET status = ?, verification_notes = ?
      WHERE id = ?
    `).run(newStatus, notes, id);

    res.json({
      eligible: isEligible,
      status: newStatus,
      remarks: notes
    });
  } catch (err) {
    res.status(500).json({ error: `Eligibility evaluation failed: ${err.message}` });
  }
};

// 5. Approve Application (Principal / Admission Officer)
exports.approveApplication = (req, res) => {
  try {
    const { id } = req.params;
    const app = db.prepare('SELECT * FROM admissions_applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (app.status === 'REJECTED') {
      return res.status(400).json({ error: 'Cannot approve an ineligible/rejected application' });
    }

    db.prepare(`
      UPDATE admissions_applications
      SET status = 'APPROVED', approved_by = ?
      WHERE id = ?
    `).run(req.user?.id || 'usr-principal', id);

    res.json({ message: 'Admission application approved for enrollment', status: 'APPROVED' });
  } catch (err) {
    res.status(500).json({ error: `Approval failed: ${err.message}` });
  }
};

// 6. Enroll Student into Central SIS Records
exports.enrollApplicant = (req, res) => {
  try {
    const { id } = req.params;
    const app = db.prepare('SELECT * FROM admissions_applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (app.status === 'ENROLLED') {
      return res.status(400).json({ error: 'Candidate is already enrolled', studentId: app.enrolled_student_id });
    }
    if (app.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Application must be APPROVED before enrollment can be completed' });
    }

    const dept = db.prepare('SELECT code FROM departments WHERE id = ?').get(app.department_id);
    const currentYear = new Date().getFullYear();
    const count = db.prepare('SELECT COUNT(*) as c FROM students WHERE department_id = ?').get(app.department_id).c + 1;

    const prn = `${currentYear}${dept ? dept.code : 'ENG'}${String(count).padStart(4, '0')}`;
    const roll_no = `42${String(count).padStart(2, '0')}`;
    const studentId = `stud-${Date.now()}`;
    const userId = `usr-${studentId}`;
    const username = `stud_${prn.toLowerCase()}`;
    const defaultPassword = 'student123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    // Get First Semester for department
    const sem = db.prepare('SELECT id FROM semesters WHERE number = 1 LIMIT 1').get() || { id: 'sem-1' };
    const div = db.prepare('SELECT id FROM divisions WHERE department_id = ? LIMIT 1').get(app.department_id);

    const tx = db.transaction(() => {
      // 1. Create User account
      db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, email, role, department_id, phone, avatar_url)
        VALUES (?, ?, ?, ?, ?, 'STUDENT', ?, ?, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
      `).run(userId, username, passwordHash, app.candidate_name, app.email, app.department_id, app.phone);

      // 2. Central Student SIS Record
      db.prepare(`
        INSERT INTO students (
          id, user_id, prn, roll_no, full_name, email, phone, gender, dob, category,
          department_id, semester_id, division_id, admission_year, guardian_name,
          guardian_phone, current_cgpa, attendance_pct
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Male', '2005-01-01', ?, ?, ?, ?, ?, 'Guardian', ?, 0.0, 100.0)
      `).run(
        studentId, userId, prn, roll_no, app.candidate_name, app.email, app.phone,
        app.category, app.department_id, sem.id, div ? div.id : null, currentYear, app.phone
      );

      // 3. Initial Fee Invoice
      const feeCategoryMap = { 'OPEN': 'cat-open', 'OBC': 'cat-obc', 'SC': 'cat-scst', 'ST': 'cat-scst', 'TFWS': 'cat-tfws' };
      const catId = feeCategoryMap[app.category] || 'cat-open';
      const feeStruct = db.prepare(`
        SELECT total_annual_fee FROM fee_structures 
        WHERE department_id = ? AND fee_category_id = ? 
        LIMIT 1
      `).get(app.department_id, catId);
      const totalAmount = feeStruct ? feeStruct.total_annual_fee : 138000;
      const invoiceId = `inv-${Date.now()}`;
      const invNumber = `INV-${currentYear}-${String(count).padStart(4, '0')}`;

      db.prepare(`
        INSERT INTO student_invoices (id, invoice_number, student_id, academic_year_id, total_amount, balance_amount, status, due_date)
        VALUES (?, ?, ?, 'ay-2025-26', ?, ?, 'PENDING', date('now', '+30 days'))
      `).run(invoiceId, invNumber, studentId, totalAmount, totalAmount);

      // 4. Update Application with Enrolled reference
      db.prepare(`
        UPDATE admissions_applications
        SET status = 'ENROLLED', enrolled_student_id = ?
        WHERE id = ?
      `).run(studentId, id);
    });

    tx();

    res.status(201).json({
      message: `Applicant successfully enrolled into Central Student Records!`,
      student: {
        id: studentId,
        prn,
        roll_no,
        username,
        initial_password: defaultPassword
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Enrollment failed: ${err.message}` });
  }
};

// 7. Admission Reporting & Analytics
exports.getAdmissionReports = (req, res) => {
  try {
    const intakeVsAdmitted = db.prepare(`
      SELECT 
        d.id as department_id,
        d.code as department_code,
        d.name as department_name,
        d.intake_capacity,
        COUNT(CASE WHEN a.status = 'APPLIED' THEN 1 END) as applied_count,
        COUNT(CASE WHEN a.status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(CASE WHEN a.status = 'ENROLLED' THEN 1 END) as enrolled_count,
        (d.intake_capacity - COUNT(CASE WHEN a.status = 'ENROLLED' THEN 1 END)) as vacant_seats
      FROM departments d
      LEFT JOIN admissions_applications a ON d.id = a.department_id
      GROUP BY d.id
    `).all();

    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM admissions_applications
      GROUP BY category
    `).all();

    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM admissions_applications
      GROUP BY status
    `).all();

    res.json({
      intakeVsAdmitted,
      categoryBreakdown,
      statusBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: `Report generation failed: ${err.message}` });
  }
};
