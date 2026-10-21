const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/support/alerts - Early warning indicators with explainable factors
router.get('/alerts', authenticate, (req, res) => {
  const { risk_level, status } = req.query;

  let query = `
    SELECT a.*, s.full_name as student_name, s.prn, s.roll_no, s.attendance_pct, s.current_cgpa,
           d.name as department_name, d.code as department_code,
           f.full_name as mentor_name
    FROM early_warning_alerts a
    JOIN students s ON a.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    LEFT JOIN faculty f ON a.mentor_faculty_id = f.id
    WHERE 1=1
  `;
  const params = [];

  // Scoping: student can see their own support plan
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    query += ' AND a.student_id = ?';
    params.push(st.id);
  }

  if (risk_level) {
    query += ' AND a.risk_level = ?';
    params.push(risk_level);
  }

  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  query += ` ORDER BY CASE a.risk_level WHEN 'CRITICAL' THEN 1 WHEN 'MODERATE' THEN 2 ELSE 3 END, a.created_at DESC`;

  const rawAlerts = db.prepare(query).all(...params);

  // Parse JSON risk factors
  const alerts = rawAlerts.map(a => {
    let factors = {};
    try {
      factors = JSON.parse(a.risk_factors);
    } catch (e) {
      factors = { note: a.risk_factors };
    }
    return { ...a, parsed_factors: factors };
  });

  res.json({ count: alerts.length, alerts });
});

// POST /api/support/scan - Run automated diagnostic scanner to flag students needing assistance
router.post('/scan', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), (req, res) => {
  const students = db.prepare(`
    SELECT s.id, s.full_name, s.prn, s.department_id, s.attendance_pct, s.current_cgpa
    FROM students s
  `).all();

  let newlyCreated = 0;
  let updatedCount = 0;

  const insertAlert = db.prepare(`
    INSERT INTO early_warning_alerts (id, student_id, risk_level, risk_factors, recommended_action, mentor_faculty_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
  `);

  const updateAlert = db.prepare(`
    UPDATE early_warning_alerts
    SET risk_level = ?, risk_factors = ?, recommended_action = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const st of students) {
      // 1. Check attendance
      const isCriticalAtt = st.attendance_pct < 65.0;
      const isLowAtt = st.attendance_pct < 75.0;

      // 2. Check CIE failures
      const failedExams = db.prepare(`
        SELECT sub.code, m.marks_obtained, e.max_marks, e.passing_marks
        FROM marks_entries m
        JOIN examinations e ON m.examination_id = e.id
        JOIN courses_subjects sub ON m.subject_id = sub.id
        WHERE m.student_id = ? AND m.marks_obtained < e.passing_marks
      `).all(st.id);

      // 3. Check fee dues
      const invoice = db.prepare('SELECT balance_amount FROM student_invoices WHERE student_id = ?').get(st.id);
      const pendingDues = invoice ? invoice.balance_amount : 0;

      const needsSupport = isLowAtt || failedExams.length > 0;
      if (needsSupport) {
        const riskLevel = (isCriticalAtt || failedExams.length >= 2) ? 'CRITICAL' : 'MODERATE';
        const factors = {
          attendance_pct: st.attendance_pct,
          attendance_flag: isLowAtt ? `Below statutory 75% threshold (${st.attendance_pct}%)` : 'Normal',
          failed_internal_subjects: failedExams.map(f => `${f.code} (Marks: ${f.marks_obtained}/${f.max_marks})`),
          pending_fee_dues: pendingDues
        };

        const recAction = riskLevel === 'CRITICAL' 
          ? 'Urgent faculty mentor 1-on-1 counseling required. Intimate parent/guardian and arrange remedial remedial problem-solving sessions.'
          : 'Schedule bi-weekly attendance check-in and assign peer study partner for challenging topics.';

        // Check if alert already exists
        const existing = db.prepare('SELECT id FROM early_warning_alerts WHERE student_id = ? AND status != "RESOLVED"').get(st.id);
        if (existing) {
          updateAlert.run(riskLevel, JSON.stringify(factors), recAction, existing.id);
          updatedCount++;
        } else {
          // Assign department HOD or faculty as default mentor
          const fac = db.prepare('SELECT id FROM faculty WHERE department_id = ? LIMIT 1').get(st.department_id);
          const alertId = `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          insertAlert.run(alertId, st.id, riskLevel, JSON.stringify(factors), recAction, fac ? fac.id : null);
          newlyCreated++;
        }
      }
    }

    logAudit(req.user.id, req.user.role, 'SCAN_EARLY_WARNING', 'SUPPORT_SYSTEM', 'ALL', { newlyCreated, updatedCount }, req);
  });

  tx();

  res.json({
    success: true,
    message: 'Academic risk scan completed',
    newAlertsCreated: newlyCreated,
    alertsUpdated: updatedCount
  });
});

// POST /api/support/counsel - Log mentoring consultation notes
router.post('/counsel', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), (req, res) => {
  const { alert_id, counseling_notes, status } = req.body;
  if (!alert_id) return res.status(400).json({ error: 'alert_id is required' });

  db.prepare(`
    UPDATE early_warning_alerts
    SET status = ?,
        recommended_action = recommended_action || ' | Mentoring Note: ' || ?
    WHERE id = ?
  `).run(status || 'COUNSELED', counseling_notes || 'Counseling session conducted with student.', alert_id);

  logAudit(req.user.id, req.user.role, 'COUNSEL_STUDENT', 'SUPPORT_ALERT', alert_id, { status, notes: counseling_notes }, req);
  res.json({ success: true, message: 'Mentoring session logged successfully' });
});

module.exports = router;
