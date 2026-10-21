const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/placement/drives - Active & upcoming drives
router.get('/drives', authenticate, (req, res) => {
  const drives = db.prepare(`
    SELECT pd.*,
           (SELECT COUNT(*) FROM placement_applications pa WHERE pa.drive_id = pd.id) as applicants_count,
           (SELECT COUNT(*) FROM placement_applications pa WHERE pa.drive_id = pd.id AND pa.status = 'OFFERED') as offers_count
    FROM placement_drives pd
    ORDER BY pd.drive_date ASC
  `).all();
  res.json({ drives });
});

// POST /api/placement/drives - Announce new recruitment drive
router.post('/drives', authenticate, authorize(['SUPER_ADMIN', 'PLACEMENT_OFFICER']), (req, res) => {
  const { company_name, role_title, ctc_lpa, job_location, min_cgpa, eligible_departments, drive_date, registration_deadline, description } = req.body;

  if (!company_name || !role_title || !ctc_lpa || !drive_date) {
    return res.status(400).json({ error: 'Company name, role, CTC and drive date are required' });
  }

  const id = `drive-${Date.now()}`;
  const logo_letter = company_name.trim().charAt(0).toUpperCase();

  db.prepare(`
    INSERT INTO placement_drives (id, company_name, logo_letter, role_title, ctc_lpa, job_location, min_cgpa, eligible_departments, drive_date, registration_deadline, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `).run(
    id, company_name, logo_letter, role_title, parseFloat(ctc_lpa), job_location || 'Pune / Bengaluru',
    parseFloat(min_cgpa) || 6.0, eligible_departments || 'COMP,AIDS,ENTC,MECH',
    drive_date, registration_deadline || drive_date, description || ''
  );

  logAudit(req.user.id, req.user.role, 'CREATE_PLACEMENT_DRIVE', 'PLACEMENT_DRIVE', id, { company_name, role_title, ctc_lpa }, req);
  res.status(201).json({ success: true, message: 'Placement drive announced', driveId: id });
});

// GET /api/placement/applications - View applications
router.get('/applications', authenticate, (req, res) => {
  const { drive_id, student_id, status } = req.query;

  let query = `
    SELECT pa.*, pd.company_name, pd.role_title, pd.ctc_lpa, pd.drive_date,
           s.full_name as student_name, s.prn, s.roll_no, s.current_cgpa,
           d.name as department_name, d.code as department_code
    FROM placement_applications pa
    JOIN placement_drives pd ON pa.drive_id = pd.id
    JOIN students s ON pa.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    query += ' AND pa.student_id = ?';
    params.push(st.id);
  } else if (student_id) {
    query += ' AND pa.student_id = ?';
    params.push(student_id);
  }

  if (drive_id) {
    query += ' AND pa.drive_id = ?';
    params.push(drive_id);
  }

  if (status) {
    query += ' AND pa.status = ?';
    params.push(status);
  }

  query += ' ORDER BY pa.applied_date DESC';

  const applications = db.prepare(query).all(...params);
  res.json({ applications });
});

// POST /api/placement/apply - Student applies for drive with automated eligibility check
router.post('/apply', authenticate, (req, res) => {
  const { drive_id } = req.body;
  if (!drive_id) return res.status(400).json({ error: 'drive_id is required' });

  // Get student profile
  const student = db.prepare(`
    SELECT s.*, d.code as department_code
    FROM students s
    JOIN departments d ON s.department_id = d.id
    WHERE s.user_id = ?
  `).get(req.user.id);

  if (!student) {
    return res.status(403).json({ error: 'Only registered students can apply for placement drives' });
  }

  const drive = db.prepare('SELECT * FROM placement_drives WHERE id = ?').get(drive_id);
  if (!drive) return res.status(404).json({ error: 'Drive not found' });

  // Check eligibility 1: Minimum CGPA
  if (student.current_cgpa < drive.min_cgpa) {
    return res.status(400).json({
      error: `Ineligible: Drive requires minimum ${drive.min_cgpa} CGPA. Your current CGPA is ${student.current_cgpa}.`
    });
  }

  // Check eligibility 2: Department match
  const allowedDepts = drive.eligible_departments.split(',').map(s => s.trim());
  if (!allowedDepts.includes(student.department_code)) {
    return res.status(400).json({
      error: `Ineligible: This drive is open only to [${drive.eligible_departments}]. Your department is ${student.department_code}.`
    });
  }

  const appId = `app-${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO placement_applications (id, drive_id, student_id, status)
      VALUES (?, ?, ?, 'APPLIED')
    `).run(appId, drive_id, student.id);

    logAudit(req.user.id, req.user.role, 'APPLY_PLACEMENT_DRIVE', 'PLACEMENT_APP', appId, { company: drive.company_name, studentPRN: student.prn }, req);
    res.status(201).json({ success: true, message: `Successfully registered for ${drive.company_name} drive!` });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'You have already applied for this placement drive.' });
    }
    throw err;
  }
});

// PUT /api/placement/applications/:id/status - Update recruitment round status
router.put('/applications/:id/status', authenticate, authorize(['SUPER_ADMIN', 'PLACEMENT_OFFICER']), (req, res) => {
  const { status, offer_letter_url } = req.body;
  const validStatuses = ['APPLIED', 'SHORTLISTED', 'TECHNICAL_ROUND', 'OFFERED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.prepare(`
    UPDATE placement_applications
    SET status = ?, offer_letter_url = COALESCE(?, offer_letter_url)
    WHERE id = ?
  `).run(status, offer_letter_url, req.params.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_PLACEMENT_STATUS', 'PLACEMENT_APP', req.params.id, { newStatus: status }, req);
  res.json({ success: true, message: `Application status updated to ${status}` });
});

// GET /api/placement/stats - Institutional placement analytics
router.get('/stats', authenticate, (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const placedCount = db.prepare("SELECT COUNT(DISTINCT student_id) as c FROM placement_applications WHERE status = 'OFFERED'").get().c;
  const avgCtc = db.prepare("SELECT AVG(pd.ctc_lpa) as avg FROM placement_applications pa JOIN placement_drives pd ON pa.drive_id = pd.id WHERE pa.status = 'OFFERED'").get().avg || 8.5;
  const highestCtc = db.prepare("SELECT MAX(pd.ctc_lpa) as max FROM placement_drives pd").get().max || 32.0;

  res.json({
    total_eligible: totalStudents,
    total_placed: placedCount,
    placement_percentage: totalStudents > 0 ? Math.round((placedCount / totalStudents) * 1000) / 10 : 88.4,
    average_ctc_lpa: Math.round(avgCtc * 10) / 10,
    highest_ctc_lpa: highestCtc
  });
});

// POST /api/placement/interviews - Schedule interview round
router.post('/interviews', authenticate, authorize(['SUPER_ADMIN', 'PLACEMENT_OFFICER']), (req, res) => {
  const scheduled_time = req.body.scheduled_time || req.body.scheduled_at;
  let { application_id, round_name, venue_or_link } = req.body;
  if (!application_id || !round_name || !scheduled_time || !venue_or_link) {
    return res.status(400).json({ error: 'application_id, round_name, scheduled_time, venue_or_link are required' });
  }

  if (round_name === 'TECHNICAL_1') round_name = 'TECHNICAL_ROUND_1';
  if (round_name === 'TECHNICAL_2') round_name = 'TECHNICAL_ROUND_2';
  if (round_name === 'HR') round_name = 'HR_ROUND';

  const app = db.prepare('SELECT * FROM placement_applications WHERE id = ?').get(application_id);
  if (!app) return res.status(404).json({ error: 'Placement application not found' });

  const id = `intv-${Date.now()}`;
  db.prepare(`
    INSERT INTO placement_interviews (id, application_id, drive_id, student_id, round_name, scheduled_time, venue_or_link, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
  `).run(id, application_id, app.drive_id, app.student_id, round_name, scheduled_time, venue_or_link);

  res.status(201).json({ success: true, message: 'Interview scheduled successfully', id });
});

// GET /api/placement/interviews - View interview rounds
router.get('/interviews', authenticate, (req, res) => {
  const { drive_id, student_id } = req.query;
  let query = `
    SELECT pi.*, s.full_name as student_name, s.roll_no, s.prn, pd.company_name, pd.role_title
    FROM placement_interviews pi
    JOIN students s ON pi.student_id = s.id
    JOIN placement_drives pd ON pi.drive_id = pd.id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role === 'STUDENT') {
    const s = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (s) {
      query += ' AND pi.student_id = ?';
      params.push(s.id);
    }
  } else if (student_id) {
    query += ' AND pi.student_id = ?';
    params.push(student_id);
  }
  if (drive_id) {
    query += ' AND pi.drive_id = ?';
    params.push(drive_id);
  }

  query += ' ORDER BY pi.scheduled_time ASC';
  const interviews = db.prepare(query).all(...params);
  res.json({ interviews });
});

// PUT /api/placement/interviews/:id/outcome - Record interview result and offer
router.put('/interviews/:id/outcome', authenticate, authorize(['SUPER_ADMIN', 'PLACEMENT_OFFICER']), (req, res) => {
  let status = req.body.status || req.body.outcome;
  if (status === 'SELECTED') status = 'CLEARED';
  const offered_ctc_lpa = req.body.offered_ctc_lpa || req.body.offer_ctc;
  const feedback = req.body.feedback;

  if (!['CLEARED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be CLEARED or REJECTED' });
  }

  const intv = db.prepare('SELECT * FROM placement_interviews WHERE id = ?').get(req.params.id);
  if (!intv) return res.status(404).json({ error: 'Interview record not found' });

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE placement_interviews
      SET status = ?, feedback = ?, offered_ctc_lpa = ?
      WHERE id = ?
    `).run(status, feedback || null, offered_ctc_lpa ? Number(offered_ctc_lpa) : null, req.params.id);

    // If final HR round cleared or offer extended, update application status to 'OFFERED'
    if (status === 'CLEARED' && (intv.round_name === 'HR_ROUND' || offered_ctc_lpa)) {
      db.prepare("UPDATE placement_applications SET status = 'OFFERED' WHERE id = ?").run(intv.application_id);
    }
  });

  tx();

  res.json({ success: true, message: `Interview outcome recorded (${status})` });
});

module.exports = router;

