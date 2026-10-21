const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// Criteria Titles reference
const CRITERIA_NAMES = {
  1: 'Curricular Aspects',
  2: 'Teaching-Learning and Evaluation',
  3: 'Research, Innovations and Extension',
  4: 'Infrastructure and Learning Resources',
  5: 'Student Support and Progression',
  6: 'Governance, Leadership and Management',
  7: 'Institutional Values and Best Practices'
};

// GET /api/naac/metrics - Quality Assurance evidence repository
router.get('/metrics', authenticate, (req, res) => {
  const { criterion_number, status, department_id } = req.query;

  let query = `
    SELECT n.*, d.name as department_name, d.code as department_code, ay.name as academic_year_name
    FROM naac_criteria_evidence n
    LEFT JOIN departments d ON n.department_id = d.id
    LEFT JOIN academic_years ay ON n.academic_year_id = ay.id
    WHERE 1=1
  `;
  const params = [];

  if (criterion_number) {
    query += ' AND n.criterion_number = ?';
    params.push(parseInt(criterion_number));
  }
  if (status) {
    query += ' AND n.status = ?';
    params.push(status);
  }
  if (department_id) {
    query += ' AND n.department_id = ?';
    params.push(department_id);
  }

  query += ' ORDER BY n.criterion_number ASC, n.metric_code ASC';

  const metrics = db.prepare(query).all(...params);

  const enriched = metrics.map(m => ({
    ...m,
    criterion_title: CRITERIA_NAMES[m.criterion_number] || `Criterion ${m.criterion_number}`
  }));

  res.json({ metrics: enriched });
});

// PUT /api/naac/metrics/:id - Update evidence details
router.put('/metrics/:id', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { status, evidence_summary, documents_count } = req.body;

  db.prepare(`
    UPDATE naac_criteria_evidence
    SET status = COALESCE(?, status),
        evidence_summary = COALESCE(?, evidence_summary),
        documents_count = COALESCE(?, documents_count),
        last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, evidence_summary, documents_count, req.params.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_NAAC_METRIC', 'NAAC_EVIDENCE', req.params.id, req.body, req);
  res.json({ success: true, message: 'NAAC/NBA evidence record updated' });
});

// GET /api/naac/summary - Institutional readiness summary
router.get('/summary', authenticate, (req, res) => {
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_metrics,
      SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready_count,
      SUM(CASE WHEN status = 'IN_REVIEW' THEN 1 ELSE 0 END) as review_count,
      SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as submitted_count,
      SUM(documents_count) as total_evidence_files
    FROM naac_criteria_evidence
  `).get();

  res.json({
    summary,
    criteriaTitles: CRITERIA_NAMES,
    overall_readiness_pct: summary.total_metrics > 0 
      ? Math.round(((summary.ready_count + summary.submitted_count) / summary.total_metrics) * 100) 
      : 85
  });
});

module.exports = router;
