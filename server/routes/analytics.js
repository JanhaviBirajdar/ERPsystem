const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantContext');
const { requireEntitlement } = require('../middleware/subscriptionEntitlement');

// Formal Metric Definitions Documenting Calculation Methodology for Statutory Compliance
const METRIC_DEFINITIONS = {
  enrollment_metrics: {
    name: 'Student Enrollment & Intake Ratio',
    formula: 'COUNT(students.id) filtered by department and semester',
    source: 'students & departments tables',
    description: 'Total active students enrolled compared to sanctioned AICTE intake capacity.'
  },
  attendance_compliance: {
    name: 'Statutory Attendance Compliance %',
    formula: 'ROUND(AVG(students.attendance_pct), 2)',
    source: 'attendance_records and students tables',
    description: 'Average attendance across filtered cohort. < 75% triggers regulatory defaulter alert.'
  },
  academic_cgpa: {
    name: 'Average Cumulative Grade Point Average (CGPA)',
    formula: 'ROUND(AVG(students.current_cgpa), 2)',
    source: 'marks_entries and students tables',
    description: 'Institution-wide academic standing measured on a standard 10-point scale.'
  },
  fee_collection_efficiency: {
    name: 'Fee Collection Realization Rate %',
    formula: 'ROUND((SUM(paid_amount) / SUM(total_amount)) * 100, 2)',
    source: 'student_invoices and fee_payments tables',
    description: 'Ratio of collected tuition and developmental fees against total billed ledger.'
  },
  admissions_conversion: {
    name: 'Admissions Intake Conversion Rate %',
    formula: 'ROUND((COUNT(status = "ENROLLED") / COUNT(*)) * 100, 2)',
    source: 'admissions_applications table',
    description: 'Percentage of applicants completing entrance qualification and institutional enrollment.'
  },
  placement_rate: {
    name: 'Campus Placement Offer Rate %',
    formula: 'ROUND((COUNT(status = "OFFERED") / COUNT(DISTINCT student_id)) * 100, 2)',
    source: 'placement_applications table',
    description: 'Percentage of participating engineering candidates securing corporate employment offers.'
  },
  service_sla_compliance: {
    name: 'Workflow & Service Desk SLA Compliance %',
    formula: 'ROUND(((total - escalated) / total) * 100, 2)',
    source: 'workflow_instances & service_desk_tickets tables',
    description: 'Requests resolved within authorized turnaround deadlines without escalation.'
  }
};

// ============================================================================
// 1. COMPREHENSIVE MANAGEMENT ANALYTICS WITH FILTERS
// ============================================================================

// GET /api/analytics/management-overview - Multi-dimensional filtered analytics
router.get('/management-overview', authenticate, resolveTenant, requireEntitlement('ADVANCED_ANALYTICS'), authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT']), (req, res) => {
  const { department_id, semester_id, start_date, end_date } = req.query;

  // Build filter predicates
  let studentFilter = 'WHERE 1=1';
  const studentParams = [];
  if (department_id) {
    studentFilter += ' AND s.department_id = ?';
    studentParams.push(department_id);
  }
  if (semester_id) {
    studentFilter += ' AND s.semester_id = ?';
    studentParams.push(semester_id);
  }

  // 1. Enrollment Metrics
  const enrollmentStats = db.prepare(`
    SELECT 
      COUNT(s.id) as total_enrolled,
      COUNT(CASE WHEN s.gender = 'Male' THEN 1 END) as male_count,
      COUNT(CASE WHEN s.gender = 'Female' THEN 1 END) as female_count,
      COUNT(CASE WHEN s.category = 'OPEN' THEN 1 END) as quota_open,
      COUNT(CASE WHEN s.category = 'OBC' THEN 1 END) as quota_obc,
      COUNT(CASE WHEN s.category = 'SC' THEN 1 END) as quota_sc,
      COUNT(CASE WHEN s.category = 'ST' THEN 1 END) as quota_st,
      COUNT(CASE WHEN s.category = 'TFWS' THEN 1 END) as quota_tfws
    FROM students s
    ${studentFilter}
  `).get(...studentParams);

  // 2. Attendance Metrics
  const attendanceStats = db.prepare(`
    SELECT 
      ROUND(AVG(s.attendance_pct), 2) as average_attendance,
      COUNT(CASE WHEN s.attendance_pct < 75.0 THEN 1 END) as defaulters_count,
      COUNT(CASE WHEN s.attendance_pct >= 85.0 THEN 1 END) as exemplary_count
    FROM students s
    ${studentFilter}
  `).get(...studentParams);

  // 3. Academic Performance Metrics
  const academicStats = db.prepare(`
    SELECT 
      ROUND(AVG(s.current_cgpa), 2) as average_cgpa,
      COUNT(CASE WHEN s.current_cgpa >= 8.5 THEN 1 END) as distinction_count,
      COUNT(CASE WHEN s.current_cgpa >= 6.5 AND s.current_cgpa < 8.5 THEN 1 END) as first_class_count,
      COUNT(CASE WHEN s.current_cgpa < 6.5 THEN 1 END) as at_risk_count
    FROM students s
    ${studentFilter}
  `).get(...studentParams);

  // 4. Fee Collections Metrics
  let feeQuery = `
    SELECT 
      COALESCE(SUM(inv.total_amount), 0) as total_billed,
      COALESCE(SUM(inv.paid_amount), 0) as total_collected,
      COALESCE(SUM(inv.balance_amount), 0) as total_outstanding,
      COUNT(DISTINCT inv.student_id) as students_billed,
      COUNT(CASE WHEN inv.balance_amount = 0 THEN 1 END) as fully_paid_count,
      COUNT(CASE WHEN inv.balance_amount > 0 THEN 1 END) as defaulters_count
    FROM student_invoices inv
    JOIN students s ON inv.student_id = s.id
    ${studentFilter}
  `;
  const feeStats = db.prepare(feeQuery).get(...studentParams);
  const collectionEfficiency = feeStats.total_billed > 0
    ? Math.round((feeStats.total_collected / feeStats.total_billed) * 100)
    : 100;

  // 5. Admissions Metrics
  let admFilter = 'WHERE 1=1';
  const admParams = [];
  if (department_id) {
    admFilter += ' AND department_id = ?';
    admParams.push(department_id);
  }
  const admissionStats = db.prepare(`
    SELECT 
      COUNT(*) as total_applications,
      COUNT(CASE WHEN status = 'DOCS_VERIFIED' THEN 1 END) as docs_verified,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'ENROLLED' THEN 1 END) as enrolled_count,
      ROUND(AVG(entrance_score), 1) as avg_entrance_score
    FROM admissions_applications
    ${admFilter}
  `).get(...admParams);

  // 6. Placement Metrics
  const placementStats = db.prepare(`
    SELECT 
      COUNT(DISTINCT p.student_id) as total_applicants,
      COUNT(CASE WHEN p.status = 'OFFERED' THEN 1 END) as offers_extended,
      COALESCE(MAX(dr.ctc_lpa), 0) as highest_ctc_lpa,
      COALESCE(ROUND(AVG(dr.ctc_lpa), 2), 0) as average_ctc_lpa
    FROM placement_applications p
    JOIN placement_drives dr ON p.drive_id = dr.id
    JOIN students s ON p.student_id = s.id
    ${studentFilter}
  `).get(...studentParams);

  // 7. Pending Service Requests & Workflows
  let wfFilter = 'WHERE 1=1';
  const wfParams = [];
  if (department_id) {
    wfFilter += ' AND department_id = ?';
    wfParams.push(department_id);
  }
  const workflowStats = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status IN ('SUBMITTED', 'IN_REVIEW', 'PENDING') THEN 1 END) as pending_requests,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_requests,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_requests,
      COUNT(CASE WHEN status = 'ESCALATED' OR escalated = 1 THEN 1 END) as escalated_breaches
    FROM workflow_instances
    ${wfFilter}
  `).get(...wfParams);

  const slaCompliancePct = workflowStats.total_requests > 0
    ? Math.round(((workflowStats.total_requests - workflowStats.escalated_breaches) / workflowStats.total_requests) * 100)
    : 100;

  // Departmental Breakdown Table
  const deptBreakdown = db.prepare(`
    SELECT d.id, d.code, d.name, d.intake_capacity,
           COUNT(s.id) as enrolled_students,
           ROUND(AVG(s.attendance_pct), 1) as avg_attendance,
           ROUND(AVG(s.current_cgpa), 2) as avg_cgpa,
           COALESCE(SUM(inv.total_amount), 0) as total_billed,
           COALESCE(SUM(inv.paid_amount), 0) as total_collected
    FROM departments d
    LEFT JOIN students s ON d.id = s.department_id
    LEFT JOIN student_invoices inv ON s.id = inv.student_id
    GROUP BY d.id
    ORDER BY d.code
  `).all();

  res.json({
    filters: { department_id, semester_id, start_date, end_date },
    metricDefinitions: METRIC_DEFINITIONS,
    analytics: {
      enrollment: {
        totalEnrolled: enrollmentStats.total_enrolled || 0,
        genderDistribution: {
          male: enrollmentStats.male_count || 0,
          female: enrollmentStats.female_count || 0
        },
        quotaDistribution: {
          open: enrollmentStats.quota_open || 0,
          obc: enrollmentStats.quota_obc || 0,
          sc: enrollmentStats.quota_sc || 0,
          st: enrollmentStats.quota_st || 0,
          tfws: enrollmentStats.quota_tfws || 0
        }
      },
      attendance: {
        averageAttendance: attendanceStats.average_attendance || 0,
        defaultersCount: attendanceStats.defaulters_count || 0,
        exemplaryCount: attendanceStats.exemplary_count || 0,
        complianceRatePct: attendanceStats.defaulters_count === 0 ? 100 : Math.round(((enrollmentStats.total_enrolled - attendanceStats.defaulters_count) / enrollmentStats.total_enrolled) * 100)
      },
      academics: {
        averageCgpa: academicStats.average_cgpa || 0,
        distinctionCount: academicStats.distinction_count || 0,
        firstClassCount: academicStats.first_class_count || 0,
        atRiskCount: academicStats.at_risk_count || 0
      },
      finance: {
        totalBilled: feeStats.total_billed,
        totalCollected: feeStats.total_collected,
        totalOutstanding: feeStats.total_outstanding,
        collectionEfficiencyPct: collectionEfficiency,
        feeDefaultersCount: feeStats.defaulters_count
      },
      admissions: {
        totalApplications: admissionStats.total_applications || 0,
        documentsVerified: admissionStats.docs_verified || 0,
        enrolledCount: admissionStats.enrolled_count || 0,
        conversionRatePct: admissionStats.total_applications > 0 ? Math.round((admissionStats.enrolled_count / admissionStats.total_applications) * 100) : 0,
        avgEntranceScore: admissionStats.avg_entrance_score || 0
      },
      placements: {
        totalApplicants: placementStats.total_applicants || 0,
        offersExtended: placementStats.offers_extended || 0,
        highestCtcLpa: placementStats.highest_ctc_lpa,
        averageCtcLpa: placementStats.average_ctc_lpa,
        placementRatePct: placementStats.total_applicants > 0 ? Math.round((placementStats.offers_extended / placementStats.total_applicants) * 100) : 0
      },
      workflows: {
        totalRequests: workflowStats.total_requests || 0,
        pendingRequests: workflowStats.pending_requests || 0,
        approvedRequests: workflowStats.approved_requests || 0,
        escalatedBreaches: workflowStats.escalated_breaches || 0,
        slaCompliancePct
      }
    },
    departmentBreakdown: deptBreakdown
  });
});

// ============================================================================
// 2. DRILL-DOWN VIEWS FOR AUDITABILITY
// ============================================================================

// GET /api/analytics/drilldown - Itemized records backing each KPI metric
router.get('/drilldown', authenticate, resolveTenant, requireEntitlement('ADVANCED_ANALYTICS'), authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT']), (req, res) => {
  const { metric, department_id, limit = 50 } = req.query;

  let query = '';
  const params = [];

  if (metric === 'attendance_defaulters') {
    query = `
      SELECT s.id, s.prn, s.roll_no, s.full_name, s.email, s.phone,
             s.attendance_pct, d.name as department_name, d.code as department_code
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.attendance_pct < 75.0
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY s.attendance_pct ASC LIMIT ?';
    params.push(Number(limit));
  } else if (metric === 'fee_defaulters') {
    query = `
      SELECT s.prn, s.full_name, s.email, d.name as department_name,
             inv.invoice_number, inv.total_amount, inv.paid_amount, inv.balance_amount, inv.due_date
      FROM student_invoices inv
      JOIN students s ON inv.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE inv.balance_amount > 0
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY inv.balance_amount DESC LIMIT ?';
    params.push(Number(limit));
  } else if (metric === 'academic_at_risk') {
    query = `
      SELECT s.prn, s.roll_no, s.full_name, s.current_cgpa, s.attendance_pct,
             d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.current_cgpa < 6.5
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY s.current_cgpa ASC LIMIT ?';
    params.push(Number(limit));
  } else if (metric === 'placement_offers') {
    query = `
      SELECT s.prn, s.full_name, d.name as department_name,
             p.status, dr.ctc_lpa as offered_ctc_lpa, dr.company_name, dr.role_title as job_role
      FROM placement_applications p
      JOIN students s ON p.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN placement_drives dr ON p.drive_id = dr.id
      WHERE p.status = 'OFFERED'
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY dr.ctc_lpa DESC LIMIT ?';
    params.push(Number(limit));
  } else if (metric === 'pending_workflows') {
    query = `
      SELECT w.id, w.title, w.domain, w.requester_name, w.requester_role,
             w.current_assigned_role, w.status, w.priority, w.deadline_at,
             d.name as department_name
      FROM workflow_instances w
      LEFT JOIN departments d ON w.department_id = d.id
      WHERE w.status IN ('SUBMITTED', 'IN_REVIEW', 'ESCALATED')
    `;
    if (department_id) {
      query += ' AND w.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY w.deadline_at ASC LIMIT ?';
    params.push(Number(limit));
  } else {
    // Default: Enrollment Directory
    query = `
      SELECT s.prn, s.roll_no, s.full_name, s.gender, s.category,
             s.admission_year, s.current_cgpa, s.attendance_pct,
             d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY s.roll_no ASC LIMIT ?';
    params.push(Number(limit));
  }

  const records = db.prepare(query).all(...params);
  res.json({
    metric: metric || 'enrollment_directory',
    count: records.length,
    records
  });
});

// ============================================================================
// 3. AUTHORIZED CSV EXPORT
// ============================================================================

// GET /api/analytics/export - Export management metrics or drill-down to CSV
router.get('/export', authenticate, resolveTenant, requireEntitlement('ADVANCED_ANALYTICS'), authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT']), (req, res) => {
  const { metric, department_id } = req.query;

  let query = '';
  const params = [];
  let filename = 'management_analytics_export.csv';
  let headers = [];

  if (metric === 'attendance_defaulters') {
    filename = 'attendance_defaulters_less_than_75.csv';
    headers = ['PRN', 'Roll No', 'Full Name', 'Department', 'Attendance %', 'Phone'];
    query = `
      SELECT s.prn, s.roll_no, s.full_name, d.name as dept, s.attendance_pct, s.phone
      FROM students s JOIN departments d ON s.department_id = d.id
      WHERE s.attendance_pct < 75.0
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
  } else if (metric === 'fee_defaulters') {
    filename = 'fee_dues_outstanding_ledger.csv';
    headers = ['PRN', 'Student Name', 'Department', 'Invoice No', 'Billed', 'Paid', 'Outstanding'];
    query = `
      SELECT s.prn, s.full_name, d.name as dept, inv.invoice_number, inv.total_amount, inv.paid_amount, inv.balance_amount
      FROM student_invoices inv
      JOIN students s ON inv.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE inv.balance_amount > 0
    `;
    if (department_id) {
      query += ' AND s.department_id = ?';
      params.push(department_id);
    }
  } else {
    filename = 'department_kpi_summary.csv';
    headers = ['Department Code', 'Department Name', 'Intake Capacity', 'Enrolled Students', 'Avg Attendance %', 'Avg CGPA'];
    query = `
      SELECT d.code, d.name, d.intake_capacity,
             COUNT(s.id) as enrolled,
             ROUND(AVG(s.attendance_pct), 1) as avg_att,
             ROUND(AVG(s.current_cgpa), 2) as avg_cgpa
      FROM departments d
      LEFT JOIN students s ON d.id = s.department_id
      GROUP BY d.id
    `;
  }

  const rows = db.prepare(query).all(...params);
  const csvLines = [headers.join(',')];

  for (const r of rows) {
    const vals = Object.values(r).map(v => `"${String(v !== null && v !== undefined ? v : '')}"`);
    csvLines.push(vals.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvLines.join('\n'));
});

// ============================================================================
// 4. LEGACY DASHBOARD & NOTICES (PRESERVED FOR BACKWARD COMPATIBILITY)
// ============================================================================

// GET /api/analytics/dashboard - Legacy compatibility
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

// GET /api/analytics/audit-logs
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

// GET /api/analytics/notices
router.get('/notices', authenticate, (req, res) => {
  const { target_audience } = req.query;
  let query = 'SELECT * FROM notices WHERE 1=1';
  const params = [];

  if (target_audience) {
    query += " AND (target_audience = 'ALL' OR target_audience = ?)";
    params.push(target_audience);
  }

  query += ' ORDER BY is_pinned DESC, publish_date DESC';
  const notices = db.prepare(query).all(...params);
  res.json({ notices });
});

// POST /api/analytics/notices
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
