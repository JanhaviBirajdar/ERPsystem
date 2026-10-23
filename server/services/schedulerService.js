const db = require('../db/database');
const workflowEngine = require('./workflowEngine');

/**
 * Enterprise Background Scheduler & Institutional Reports Engine
 * Matches `scheduled_reports` schema and powers SLA escalations and periodic compliance audits
 */
class SchedulerService {
  constructor() {
    this.timer = null;
    this.intervalMs = 60000; // 60s tick interval
  }

  start() {
    if (process.env.VERCEL) {
      console.log('⏱️ Serverless environment detected: Interval scheduler skipped.');
      return;
    }
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runTick().catch(err => console.error('Scheduler tick error:', err.message));
    }, this.intervalMs);
    if (this.timer.unref) this.timer.unref();
    console.log('⏱️ Workflow SLA & Scheduled Institutional Reports Engine active (60s tick).');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runTick() {
    const timestamp = new Date().toISOString();
    // 1. Process pending workflow deadlines, escalations and reminders
    const workflowSlaResults = await workflowEngine.processWorkflowDeadlinesAndReminders();

    // 2. Generate daily compliance audit snapshot if needed
    const reportResults = await this.compileDailyComplianceSnapshot();

    return {
      timestamp,
      workflowsProcessed: workflowSlaResults.processedTotal,
      escalationsTriggered: workflowSlaResults.escalationsCount,
      remindersTriggered: workflowSlaResults.remindersCount,
      reportStatus: reportResults.status
    };
  }

  /**
   * Compile and record daily compliance snapshot in scheduled_reports
   */
  async compileDailyComplianceSnapshot() {
    const reportId = `rep-daily-${new Date().toISOString().split('T')[0]}`;
    const existing = db.prepare('SELECT id FROM scheduled_reports WHERE id = ?').get(reportId);
    if (existing) {
      return { status: 'ALREADY_COMPILED_TODAY' };
    }

    const data = await this.generateReportData('WORKFLOW_COMPLIANCE_DAILY');
    db.prepare(`
      INSERT OR REPLACE INTO scheduled_reports (
        id, report_type, frequency, period_start, period_end, summary_data_json, generated_at, status
      ) VALUES (?, 'WORKFLOW_COMPLIANCE_DAILY', 'DAILY', date('now', '-1 day'), date('now'), ?, CURRENT_TIMESTAMP, 'COMPLETED')
    `).run(reportId, JSON.stringify(data));

    return { status: 'COMPILED_NEW_SNAPSHOT', reportId };
  }

  /**
   * Generate institutional report data by type
   */
  async generateReportData(reportType) {
    const validTypes = [
      'WORKFLOW_COMPLIANCE_DAILY',
      'SLA_BREACH_SUMMARY',
      'DEPARTMENT_LEAVE_UTILIZATION',
      'CERTIFICATE_ISSUANCE_METRICS',
      'GRIEVANCE_RESOLUTION_AUDIT'
    ];

    const type = validTypes.includes(reportType) ? reportType : 'WORKFLOW_COMPLIANCE_DAILY';

    if (type === 'WORKFLOW_COMPLIANCE_DAILY' || type === 'SLA_BREACH_SUMMARY') {
      const total = db.prepare('SELECT COUNT(*) as c FROM workflow_instances').get().c;
      const approved = db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status = 'APPROVED'").get().c;
      const rejected = db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status = 'REJECTED'").get().c;
      const inReview = db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status IN ('SUBMITTED', 'IN_REVIEW')").get().c;
      const escalated = db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status = 'ESCALATED' OR escalated = 1").get().c;

      const domainBreakdown = db.prepare(`
        SELECT domain, COUNT(*) as count,
               SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
               SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) as escalated_count
        FROM workflow_instances
        GROUP BY domain
      `).all();

      const complianceRate = total > 0 ? Math.round(((total - escalated) / total) * 100) : 100;

      return {
        reportType: type,
        reportName: 'Institutional Workflow SLA & Turnaround Time Compliance Audit',
        generatedAt: new Date().toISOString(),
        summary: {
          totalRequests: total,
          approvedRequests: approved,
          rejectedRequests: rejected,
          pendingRequests: inReview,
          escalatedBreaches: escalated,
          complianceRate: `${complianceRate}%`
        },
        domainBreakdown
      };
    }

    if (type === 'CERTIFICATE_ISSUANCE_METRICS') {
      const docs = db.prepare(`
        SELECT d.id, d.document_number, d.template_type, d.title, d.verification_code,
               d.issued_at, d.issued_by_name, u.full_name as student_name,
               dept.name as department_name
        FROM generated_documents d
        JOIN users u ON d.owner_user_id = u.id
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.is_revoked = 0
        ORDER BY d.issued_at DESC
      `).all();

      const breakdown = db.prepare(`
        SELECT template_type, COUNT(*) as count
        FROM generated_documents
        WHERE is_revoked = 0
        GROUP BY template_type
      `).all();

      return {
        reportType: type,
        reportName: 'Institutional Certificate & Verifiable Credential Registry',
        generatedAt: new Date().toISOString(),
        totalIssued: docs.length,
        templateBreakdown: breakdown,
        records: docs
      };
    }

    if (type === 'DEPARTMENT_LEAVE_UTILIZATION') {
      const leaves = db.prepare(`
        SELECT f.emp_code, f.full_name as faculty_name, d.name as department_name,
               COUNT(l.id) as total_leaves_applied,
               SUM(CASE WHEN l.status = 'APPROVED' THEN l.days_count ELSE 0 END) as approved_days
        FROM faculty f
        JOIN departments d ON f.department_id = d.id
        LEFT JOIN faculty_leaves l ON f.id = l.faculty_id
        GROUP BY f.id
        ORDER BY approved_days DESC
      `).all();

      return {
        reportType: type,
        reportName: 'Faculty Leave Utilization & Academic Workload Report',
        generatedAt: new Date().toISOString(),
        facultyRecords: leaves
      };
    }

    if (type === 'GRIEVANCE_RESOLUTION_AUDIT') {
      const grievances = db.prepare(`
        SELECT w.id, w.title, w.requester_name, w.status, w.created_at, w.updated_at,
               d.name as department_name
        FROM workflow_instances w
        LEFT JOIN departments d ON w.department_id = d.id
        WHERE w.domain = 'GRIEVANCE'
        ORDER BY w.created_at DESC
      `).all();

      const total = grievances.length;
      const resolved = grievances.filter(g => g.status === 'APPROVED').length;

      return {
        reportType: type,
        reportName: 'Student Grievance Redressal Committee Statutory Audit',
        generatedAt: new Date().toISOString(),
        summary: {
          totalGrievances: total,
          resolved,
          pending: total - resolved,
          resolutionPct: total > 0 ? `${Math.round((resolved / total) * 100)}%` : '100%'
        },
        records: grievances
      };
    }
  }

  /**
   * Export report data to CSV
   */
  exportToCsv(reportType, reportData) {
    if (reportType === 'CERTIFICATE_ISSUANCE_METRICS' && reportData.records) {
      const headers = ['Document Number', 'Certificate Title', 'Student Name', 'Department', 'Verification Code', 'Issued Date'];
      const rows = reportData.records.map(r => [
        `"${r.document_number}"`,
        `"${r.title}"`,
        `"${r.student_name}"`,
        `"${r.department_name || 'Engineering'}"`,
        `"${r.verification_code}"`,
        `"${r.issued_at}"`
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    if (reportType === 'DEPARTMENT_LEAVE_UTILIZATION' && reportData.facultyRecords) {
      const headers = ['Emp Code', 'Faculty Name', 'Department', 'Leaves Applied', 'Approved Days'];
      const rows = reportData.facultyRecords.map(r => [
        `"${r.emp_code}"`,
        `"${r.faculty_name}"`,
        `"${r.department_name}"`,
        r.total_leaves_applied || 0,
        r.approved_days || 0
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    if (reportData.domainBreakdown) {
      const headers = ['Workflow Domain', 'Total Requests', 'Approved Count', 'Escalations'];
      const rows = reportData.domainBreakdown.map(r => [
        `"${r.domain}"`,
        r.count,
        r.approved_count,
        r.escalated_count
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return `Report,${reportType}\nGeneratedAt,${reportData.generatedAt || new Date().toISOString()}\nStatus,Exported`;
  }
}

module.exports = new SchedulerService();
