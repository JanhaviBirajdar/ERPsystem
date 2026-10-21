const db = require('../db/database');

// 1. Create Assignment (Faculty)
exports.createAssignment = (req, res) => {
  try {
    const { title, description, subject_id, division_id, max_marks = 20, due_date, attachment_url } = req.body;
    if (!title || !subject_id || !division_id || !due_date) {
      return res.status(400).json({ error: 'title, subject_id, division_id, and due_date are required' });
    }

    let facultyId = null;
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) {
      facultyId = fac.id;
    } else {
      const alloc = db.prepare('SELECT faculty_id FROM subject_allocations WHERE subject_id = ? AND division_id = ? LIMIT 1').get(subject_id, division_id);
      const defaultFac = db.prepare('SELECT id FROM faculty LIMIT 1').get();
      facultyId = alloc ? alloc.faculty_id : (defaultFac ? defaultFac.id : 'fac-mehta');
    }

    const id = `asgn-${Date.now()}`;
    db.prepare(`
      INSERT INTO assignments (id, title, description, subject_id, division_id, faculty_id, max_marks, due_date, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', subject_id, division_id, facultyId, Number(max_marks), due_date, attachment_url || null);

    res.status(201).json({ success: true, message: 'Assignment created successfully', id });
  } catch (err) {
    res.status(500).json({ error: `Failed to create assignment: ${err.message}` });
  }
};

// 2. Get Assignments List
exports.getAssignments = (req, res) => {
  try {
    const { division_id, subject_id } = req.query;
    let query = `
      SELECT a.*, sub.name as subject_name, sub.code as subject_code,
             div.name as division_name, f.full_name as faculty_name,
             (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) as submission_count
      FROM assignments a
      JOIN courses_subjects sub ON a.subject_id = sub.id
      JOIN divisions div ON a.division_id = div.id
      LEFT JOIN faculty f ON a.faculty_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (division_id) {
      query += ` AND a.division_id = ?`;
      params.push(division_id);
    }
    if (subject_id) {
      query += ` AND a.subject_id = ?`;
      params.push(subject_id);
    }

    // If student, check if student has submitted
    let studentId = null;
    if (req.user?.role === 'STUDENT') {
      const s = db.prepare('SELECT id, division_id FROM students WHERE user_id = ?').get(req.user.id);
      if (s) {
        studentId = s.id;
        if (!division_id && s.division_id) {
          query += ` AND a.division_id = ?`;
          params.push(s.division_id);
        }
      }
    }

    query += ` ORDER BY a.due_date ASC`;
    const assignments = db.prepare(query).all(...params);

    // Attach student submission status if student
    const result = assignments.map(a => {
      let mySubmission = null;
      if (studentId) {
        mySubmission = db.prepare('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?').get(a.id, studentId);
      }
      return {
        ...a,
        mySubmission: mySubmission || null
      };
    });

    res.json({ assignments: result });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch assignments: ${err.message}` });
  }
};

// 3. Submit Assignment (Student)
exports.submitAssignment = (req, res) => {
  try {
    const { id } = req.params;
    const { submission_text, file_url } = req.body;

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    let studentId = null;
    const s = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (s) studentId = s.id;
    if (!studentId) return res.status(403).json({ error: 'Only registered students can submit assignments' });

    const isLate = new Date() > new Date(assignment.due_date);
    const subStatus = isLate ? 'LATE' : 'SUBMITTED';

    const subId = `subm-${Date.now()}`;
    db.prepare(`
      INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, file_url, status)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(assignment_id, student_id) DO UPDATE SET
        submission_text = excluded.submission_text,
        file_url = excluded.file_url,
        submitted_at = CURRENT_TIMESTAMP,
        status = excluded.status
    `).run(subId, id, studentId, submission_text || '', file_url || 'https://drive.google.com/sample-submission.pdf', subStatus);

    res.status(201).json({
      success: true,
      message: isLate ? 'Assignment submitted (LATE submission recorded)' : 'Assignment submitted successfully on time',
      status: subStatus
    });
  } catch (err) {
    res.status(500).json({ error: `Assignment submission failed: ${err.message}` });
  }
};

// 4. Get Submissions for an Assignment (Faculty)
exports.getSubmissions = (req, res) => {
  try {
    const { id } = req.params;
    const submissions = db.prepare(`
      SELECT s.*, stud.full_name as student_name, stud.roll_no, stud.prn
      FROM assignment_submissions s
      JOIN students stud ON s.student_id = stud.id
      WHERE s.assignment_id = ?
      ORDER BY s.submitted_at DESC
    `).all(id);

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch submissions: ${err.message}` });
  }
};

// 5. Grade Assignment Submission (Faculty)
exports.gradeSubmission = (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marks_obtained, feedback } = req.body;

    if (marks_obtained === undefined) {
      return res.status(400).json({ error: 'marks_obtained is required' });
    }

    db.prepare(`
      UPDATE assignment_submissions
      SET marks_obtained = ?, feedback = ?, status = 'GRADED'
      WHERE id = ?
    `).run(Number(marks_obtained), feedback || 'Well done', submissionId);

    res.json({ success: true, message: 'Submission evaluated and feedback recorded' });
  } catch (err) {
    res.status(500).json({ error: `Grading failed: ${err.message}` });
  }
};

// 6. Upload / Register Academic Study Resource
exports.createResource = (req, res) => {
  try {
    const { title, subject_id, module_number = 1, resource_type = 'LECTURE_NOTES', file_url, file_size_kb = 2048 } = req.body;
    if (!title || !subject_id || !file_url) {
      return res.status(400).json({ error: 'title, subject_id, and file_url are required' });
    }

    let facultyId = null;
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) facultyId = fac.id;

    const id = `res-${Date.now()}`;
    db.prepare(`
      INSERT INTO academic_resources (id, title, subject_id, module_number, resource_type, file_url, file_size_kb, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, subject_id, Number(module_number), resource_type, file_url, Number(file_size_kb), facultyId);

    res.status(201).json({ success: true, message: 'Study material uploaded successfully', id });
  } catch (err) {
    res.status(500).json({ error: `Resource upload failed: ${err.message}` });
  }
};

// 7. Get Study Resources List
exports.getResources = (req, res) => {
  try {
    const { subject_id, resource_type } = req.query;
    let query = `
      SELECT r.*, sub.name as subject_name, sub.code as subject_code, f.full_name as faculty_name
      FROM academic_resources r
      JOIN courses_subjects sub ON r.subject_id = sub.id
      LEFT JOIN faculty f ON r.uploaded_by = f.id
      WHERE 1=1
    `;
    const params = [];
    if (subject_id) {
      query += ` AND r.subject_id = ?`;
      params.push(subject_id);
    }
    if (resource_type) {
      query += ` AND r.resource_type = ?`;
      params.push(resource_type);
    }
    query += ` ORDER BY r.module_number ASC, r.created_at DESC`;

    const resources = db.prepare(query).all(...params);
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch resources: ${err.message}` });
  }
};
