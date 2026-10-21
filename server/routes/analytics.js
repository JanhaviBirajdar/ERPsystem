const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/analytics/dashboard - Comprehensive live metrics
router.get('/dashboard', authenticate, (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const totalFaculty = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
  const totalDepartments = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
  
  const feeStats = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_billed,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(balance_amount), 0) as total_outstanding
    FROM student_invoices
  `).get();

  const attendanceAvg = db.prepare('SELECT ROUND(AVG(attendance_pct), 1) as avg FROM students').get().avg || 84.5;
  const atRiskCount = db.prepare("SELECT COUNT(*) as c FROM early_warning_alerts WHERE status = 'OPEN'").get().c;
  const pendingTickets = db.prepare("SELECT COUNT(*) as c FROM service_desk_tickets WHERE status = 'PENDING'").get().c;
  const placementOffers = db.prepare("SELECT COUNT(*) as c FROM placement_applications WHERE status = 'OFFERED'").get().c;

  // Department enrollment & stats
  const deptStats = db.prepare(`
    SELECT d.id, d.code, d.name, d.intake_capacity,
           COUNT(s.id) as enrolled_students,
           ROUND(AVG(s.attendance_pct), 1) as avg_attendance,
           ROUND(AVG(s.current_cgpa), 2) as avg_cgpa
    FROM departments d
    LEFT JOIN students s ON d.id = s.department_id
    GROUP BY d.id
    ORDER BY d.code
  `).all();

  // Notices
  const notices = db.prepare('SELECT * FROM notices ORDER BY is_pinned DESC, publish_date DESC LIMIT 5').all();

  res.json({
    kpis: {
      totalStudents,
      totalFaculty,
      totalDepartments,
      feeCollection: feeStats.total_collected,
      feeOutstanding: feeStats.total_outstanding,
      averageAttendance: attendanceAvg,
      atRiskCount,
      pendingTickets,
      placementOffers
    },
    departmentStats: deptStats,
    notices
  });
});

// GET /api/analytics/audit-logs - System security audit trail
router.get('/audit-logs', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  const { limit = 30 } = req.query;
  const logs = db.prepare(`
    SELECT a.*, u.full_name as user_name, u.username
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(parseInt(limit));

  res.json({ logs });
});

// GET /api/analytics/notices - All notices
router.get('/notices', authenticate, (req, res) => {
  const { target_audience } = req.query;
  let query = 'SELECT * FROM notices WHERE 1=1';
  const params = [];

  if (target_audience) {
    query += ' AND (target_audience = "ALL" OR target_audience = ?)';
    params.push(target_audience);
  }

  query += ' ORDER BY is_pinned DESC, publish_date DESC';
  const notices = db.prepare(query).all(...params);
  res.json({ notices });
});

// POST /api/analytics/notices - Publish announcement
router.post('/notices', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), (req, res) => {
  const { title, content, target_audience, category, is_pinned } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const id = `not-${Date.now()}`;
  const now = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO notices (id, title, content, target_audience, department_id, is_pinned, category, publish_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, content, target_audience || 'ALL', req.user.department_id || null,
    is_pinned ? 1 : 0, category || 'Academic', now
  );

  logAudit(req.user.id, req.user.role, 'PUBLISH_NOTICE', 'NOTICE', id, { title, target_audience }, req);
  res.status(201).json({ success: true, message: 'Notice published', noticeId: id });
});

module.exports = router;
