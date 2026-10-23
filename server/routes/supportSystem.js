const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// Default Institutional Academic Support Policy Thresholds
const DEFAULT_THRESHOLDS = {
  id: 'default',
  attendance_min_pct: 75.0,
  attendance_critical_pct: 65.0,
  marks_min_pct: 40.0,
  max_missed_assignments: 2,
  cgpa_at_risk: 6.5
};

// Helper: Get or initialize active thresholds
function getActiveThresholds() {
  let config = db.prepare('SELECT * FROM support_threshold_configs WHERE id = ?').get('default');
  if (!config) {
    db.prepare(`
      INSERT INTO support_threshold_configs (id, attendance_min_pct, attendance_critical_pct, marks_min_pct, max_missed_assignments, cgpa_at_risk, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, 'SYSTEM')
    `).run(
      DEFAULT_THRESHOLDS.id,
      DEFAULT_THRESHOLDS.attendance_min_pct,
      DEFAULT_THRESHOLDS.attendance_critical_pct,
      DEFAULT_THRESHOLDS.marks_min_pct,
      DEFAULT_THRESHOLDS.max_missed_assignments,
      DEFAULT_THRESHOLDS.cgpa_at_risk
    );
    config = db.prepare('SELECT * FROM support_threshold_configs WHERE id = ?').get('default');
  }
  return config;
}

// ============================================================================
// 1. CONFIGURABLE ACADEMIC SUPPORT THRESHOLDS
// ============================================================================

// GET /api/support/thresholds - Retrieve active configurable thresholds
router.get('/thresholds', authenticate, (req, res) => {
  const config = getActiveThresholds();
  res.json({
    thresholds: config,
    policyNotice: 'Alert thresholds configure predictive risk detection without triggering automatic disciplinary action.'
  });
});

// PUT /api/support/thresholds - Update configurable thresholds
router.put('/thresholds', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const {
    attendance_min_pct,
    attendance_critical_pct,
    marks_min_pct,
    max_missed_assignments,
    cgpa_at_risk
  } = req.body;

  // Validation
  const attMin = Number(attendance_min_pct);
  const attCrit = Number(attendance_critical_pct);
  const marksMin = Number(marks_min_pct);
  const missedMax = Number(max_missed_assignments);
  const cgpaRisk = Number(cgpa_at_risk);

  if (isNaN(attMin) || attMin < 50 || attMin > 95) {
    return res.status(400).json({ error: 'attendance_min_pct must be between 50% and 95%' });
  }
  if (isNaN(attCrit) || attCrit < 30 || attCrit >= attMin) {
    return res.status(400).json({ error: `attendance_critical_pct must be between 30% and less than min attendance (${attMin}%)` });
  }
  if (isNaN(marksMin) || marksMin < 20 || marksMin > 80) {
    return res.status(400).json({ error: 'marks_min_pct must be between 20% and 80%' });
  }
  if (isNaN(missedMax) || missedMax < 1 || missedMax > 10) {
    return res.status(400).json({ error: 'max_missed_assignments must be between 1 and 10' });
  }
  if (isNaN(cgpaRisk) || cgpaRisk < 4.0 || cgpaRisk > 9.0) {
    return res.status(400).json({ error: 'cgpa_at_risk must be between 4.0 and 9.0' });
  }

  getActiveThresholds(); // Ensure row exists

  db.prepare(`
    UPDATE support_threshold_configs
    SET attendance_min_pct = ?,
        attendance_critical_pct = ?,
        marks_min_pct = ?,
        max_missed_assignments = ?,
        cgpa_at_risk = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'default'
  `).run(attMin, attCrit, marksMin, missedMax, cgpaRisk, req.user.username || req.user.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_SUPPORT_THRESHOLDS', 'SUPPORT_CONFIG', 'default', {
    attendance_min_pct: attMin,
    attendance_critical_pct: attCrit,
    marks_min_pct: marksMin,
    max_missed_assignments: missedMax,
    cgpa_at_risk: cgpaRisk
  }, req);

  const updated = getActiveThresholds();
  res.json({
    success: true,
    message: 'Academic support thresholds successfully updated',
    thresholds: updated
  });
});

// ============================================================================
// 2. DIAGNOSTIC SCAN WITH EXPLAINABLE MULTI-FACTOR ANALYSIS
// ============================================================================

// POST /api/support/scan - Run diagnostic scanner on attendance, marks, and assignments
router.post('/scan', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), (req, res) => {
  const thresholds = getActiveThresholds();

  const students = db.prepare(`
    SELECT s.id, s.full_name, s.prn, s.department_id, s.attendance_pct, s.current_cgpa, s.semester_id
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
      // 1. Attendance Evaluation
      const isCriticalAtt = st.attendance_pct < thresholds.attendance_critical_pct;
      const isLowAtt = st.attendance_pct < thresholds.attendance_min_pct;

      // 2. Internal Exam (CIE / Marks) Evaluation
      const lowExamEntries = db.prepare(`
        SELECT sub.code, sub.name as subject_name, m.marks_obtained, e.max_marks, e.passing_marks,
               ROUND((m.marks_obtained * 100.0 / e.max_marks), 1) as pct
        FROM marks_entries m
        JOIN examinations e ON m.examination_id = e.id
        JOIN courses_subjects sub ON m.subject_id = sub.id
        WHERE m.student_id = ? AND (
          m.marks_obtained < e.passing_marks OR
          (m.marks_obtained * 100.0 / e.max_marks) < ?
        )
      `).all(st.id, thresholds.marks_min_pct);

      // 3. Assignment Trends Evaluation
      // Check assignments associated with student's department/semester that are past deadline
      const missedAssignments = db.prepare(`
        SELECT a.id, a.title, a.due_date, sub.name as subject_name
        FROM assignments a
        JOIN courses_subjects sub ON a.subject_id = sub.id
        WHERE a.due_date < datetime('now')
          AND NOT EXISTS (
            SELECT 1 FROM assignment_submissions sub_rec
            WHERE sub_rec.assignment_id = a.id AND sub_rec.student_id = ?
          )
      `).all(st.id);

      const hasMissedAssignments = missedAssignments.length >= thresholds.max_missed_assignments;
      const isLowCgpa = st.current_cgpa < thresholds.cgpa_at_risk;

      // Determine need for academic support
      const needsSupport = isLowAtt || lowExamEntries.length > 0 || hasMissedAssignments || isLowCgpa;

      if (needsSupport) {
        // Multi-factor Risk Severity Assessment
        let severityScore = 0;
        if (isCriticalAtt) severityScore += 3;
        else if (isLowAtt) severityScore += 1;

        if (lowExamEntries.length >= 2) severityScore += 2;
        else if (lowExamEntries.length === 1) severityScore += 1;

        if (missedAssignments.length >= 3) severityScore += 2;
        else if (hasMissedAssignments) severityScore += 1;

        if (st.current_cgpa < 5.5) severityScore += 2;
        else if (isLowCgpa) severityScore += 1;

        const riskLevel = severityScore >= 3 ? 'CRITICAL' : 'MODERATE';

        // Build human-explainable reason narrative
        const reasons = [];
        if (isLowAtt) {
          reasons.push(`Attendance at ${st.attendance_pct}% is below statutory threshold of ${thresholds.attendance_min_pct}%`);
        }
        if (lowExamEntries.length > 0) {
          reasons.push(`${lowExamEntries.length} course(s) flagged with scores below benchmark (${lowExamEntries.map(e => e.code).join(', ')})`);
        }
        if (hasMissedAssignments) {
          reasons.push(`${missedAssignments.length} overdue assignment(s) unsubmitted past deadline`);
        }
        if (isLowCgpa) {
          reasons.push(`Current CGPA (${st.current_cgpa}) is under the advisory threshold of ${thresholds.cgpa_at_risk}`);
        }

        const explanation = `Student flagged for proactive support: ${reasons.join('; ')}.`;

        const structuredFactors = {
          explanation,
          triggers: {
            attendance: {
              current: st.attendance_pct,
              threshold: thresholds.attendance_min_pct,
              critical_threshold: thresholds.attendance_critical_pct,
              flagged: isLowAtt
            },
            academics: {
              current_cgpa: st.current_cgpa,
              cgpa_threshold: thresholds.cgpa_at_risk,
              flagged_subjects: lowExamEntries.map(e => ({
                subject: e.code,
                marks: `${e.marks_obtained}/${e.max_marks} (${e.pct}%)`
              })),
              flagged: lowExamEntries.length > 0 || isLowCgpa
            },
            assignments: {
              missed_count: missedAssignments.length,
              threshold: thresholds.max_missed_assignments,
              missed_titles: missedAssignments.map(a => a.title),
              flagged: hasMissedAssignments
            }
          },
          governance: {
            automatic_disciplinary_action: false,
            purpose: 'Early mentorship, academic advising, and tutoring interventions only.',
            non_punitive_guarantee: 'Zero automated negative consequences permitted.'
          }
        };

        const recAction = riskLevel === 'CRITICAL'
          ? 'Urgent faculty mentor 1-on-1 counseling required. Intimate parent/guardian and arrange remedial problem-solving sessions.'
          : 'Schedule bi-weekly attendance check-in and assign peer study partner for challenging topics.';

        // Check if active alert already exists
        const existing = db.prepare("SELECT id FROM early_warning_alerts WHERE student_id = ? AND status != 'RESOLVED'").get(st.id);
        if (existing) {
          updateAlert.run(riskLevel, JSON.stringify(structuredFactors), recAction, existing.id);
          updatedCount++;
        } else {
          const fac = db.prepare('SELECT id FROM faculty WHERE department_id = ? LIMIT 1').get(st.department_id);
          const alertId = `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          insertAlert.run(alertId, st.id, riskLevel, JSON.stringify(structuredFactors), recAction, fac ? fac.id : null);
          newlyCreated++;
        }
      }
    }

    logAudit(req.user.id, req.user.role, 'SCAN_EARLY_WARNING', 'SUPPORT_SYSTEM', 'ALL', { newlyCreated, updatedCount }, req);
  });

  tx();

  res.json({
    success: true,
    message: 'Academic risk scan completed using active thresholds',
    thresholdsUsed: thresholds,
    newAlertsCreated: newlyCreated,
    alertsUpdated: updatedCount
  });
});

// ============================================================================
// 3. FACULTY INTERVENTIONS (STRICTLY SUPPORTIVE, NON-PUNITIVE)
// ============================================================================

// POST /api/support/interventions - Authorized faculty records supportive intervention
router.post('/interventions', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), (req, res) => {
  const { alert_id, student_id, intervention_type, action_taken, student_feedback, follow_up_date } = req.body;

  if (!student_id || !intervention_type || !action_taken) {
    return res.status(400).json({ error: 'student_id, intervention_type, and action_taken are required' });
  }

  const validTypes = ['REMEDIAL_CLASS', 'MENTORING_SESSION', 'STUDY_GROUP', 'ACADEMIC_ADVISING', 'COUNSELING', 'PEER_TUTORING'];
  if (!validTypes.includes(intervention_type)) {
    return res.status(400).json({
      error: `Invalid intervention_type. Permitted types: ${validTypes.join(', ')}`
    });
  }

  // Ensure faculty record
  let facultyId = null;
  let facultyName = req.user.full_name || req.user.username;
  if (req.user.role === 'FACULTY') {
    const fRec = db.prepare('SELECT id, full_name FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fRec) {
      facultyId = fRec.id;
      facultyName = fRec.full_name;
    }
  }

  const id = `intv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  db.prepare(`
    INSERT INTO support_interventions (
      id, alert_id, student_id, faculty_id, faculty_name, intervention_type, action_taken, student_feedback, follow_up_date, disciplinary_action_prohibited
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id, alert_id || null, student_id, facultyId, facultyName,
    intervention_type, action_taken, student_feedback || null, follow_up_date || null
  );

  // If tied to an alert, mark alert as COUNSELED
  if (alert_id) {
    db.prepare(`
      UPDATE early_warning_alerts
      SET status = 'COUNSELED',
          recommended_action = recommended_action || ' | Recorded: ' || ?
      WHERE id = ?
    `).run(`${intervention_type} on ${new Date().toISOString().split('T')[0]}`, alert_id);
  }

  logAudit(req.user.id, req.user.role, 'RECORD_INTERVENTION', 'SUPPORT_INTERVENTION', id, {
    student_id,
    intervention_type,
    action_taken
  }, req);

  res.status(201).json({
    success: true,
    message: 'Academic support intervention successfully recorded. Non-punitive policy enforced.',
    interventionId: id,
    disciplinaryActionProhibited: true
  });
});

// GET /api/support/interventions - Retrieve intervention history
router.get('/interventions', authenticate, (req, res) => {
  const { student_id, alert_id } = req.query;

  let query = 'SELECT * FROM support_interventions WHERE 1=1';
  const params = [];

  // Scoping: student can only view their own interventions
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    query += ' AND student_id = ?';
    params.push(st.id);
  } else if (student_id) {
    query += ' AND student_id = ?';
    params.push(student_id);
  }

  if (alert_id) {
    query += ' AND alert_id = ?';
    params.push(alert_id);
  }

  query += ' ORDER BY created_at DESC';
  const interventions = db.prepare(query).all(...params);

  res.json({
    count: interventions.length,
    interventions
  });
});

// ============================================================================
// 4. RETRIEVE EARLY WARNING ALERTS WITH EXPLANATIONS & INTERVENTIONS
// ============================================================================

// GET /api/support/alerts - Early warning indicators with explainable factors
router.get('/alerts', authenticate, (req, res) => {
  const { risk_level, status } = req.query;

  let query = `
    SELECT a.*, s.full_name as student_name, s.prn, s.roll_no, s.attendance_pct, s.current_cgpa,
           d.name as department_name, d.code as department_code,
           f.full_name as mentor_name,
           (SELECT COUNT(*) FROM support_interventions si WHERE si.alert_id = a.id) as intervention_count
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

  // Parse JSON risk factors and extract explanation
  const alerts = rawAlerts.map(a => {
    let factors = {};
    try {
      factors = JSON.parse(a.risk_factors);
    } catch (e) {
      factors = { explanation: a.risk_factors };
    }
    return {
      ...a,
      explanation: factors.explanation || 'Academic attendance and marks advisory alert.',
      parsed_factors: factors
    };
  });

  res.json({ count: alerts.length, alerts });
});

// POST /api/support/counsel - Legacy mentoring consultation notes (preserved for backward compatibility)
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
