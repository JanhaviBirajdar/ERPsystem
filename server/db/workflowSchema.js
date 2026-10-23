const db = require('./database');

function initWorkflowSchema() {
  // Create performance indexes matching existing schema
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_wf_inst_status ON workflow_instances(status, current_step);
      CREATE INDEX IF NOT EXISTS idx_wf_inst_req ON workflow_instances(requester_id);
      CREATE INDEX IF NOT EXISTS idx_wf_inst_dept ON workflow_instances(department_id, status);
      CREATE INDEX IF NOT EXISTS idx_wf_inst_deadline ON workflow_instances(deadline_at);
      CREATE INDEX IF NOT EXISTS idx_wf_step_logs ON workflow_step_logs(instance_id);
      CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_notifs_role ON notifications(target_role, target_department_id);
      CREATE INDEX IF NOT EXISTS idx_gen_docs_owner ON generated_documents(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_gen_docs_hash ON generated_documents(verification_hash);
      CREATE INDEX IF NOT EXISTS idx_announcements_aud ON department_announcements(target_audience, department_id);
    `);
  } catch (err) {
    console.warn('Index initialization notice:', err.message);
  }

  // Ensure default workflow definitions are present
  seedWorkflowDefinitions();

  // Ensure initial workflow instances are present for rich out-of-the-box demo
  seedSampleWorkflowInstances();
}

function seedWorkflowDefinitions() {
  const count = db.prepare('SELECT COUNT(*) as c FROM workflow_definitions').get().c;
  if (count >= 5) return;

  const defs = [
    {
      id: 'wf-def-bonafide',
      name: 'Student Bonafide Certificate Workflow',
      domain: 'CERTIFICATE',
      description: 'Verifiable approval workflow for issuing official institutional bonafide certificates.',
      steps_config: JSON.stringify([
        { step: 1, name: 'Department HOD Verification', role: 'HOD', sla_hours: 24, escalate_to: 'PRINCIPAL', can_reject: true, can_request_changes: true },
        { step: 2, name: 'Academic Office & Registrar Issuance', role: 'SUPER_ADMIN', sla_hours: 24, escalate_to: 'PRINCIPAL', can_reject: true, can_request_changes: true }
      ])
    },
    {
      id: 'wf-def-leaving',
      name: 'College Leaving & Transfer Certificate Workflow',
      domain: 'CERTIFICATE',
      description: 'Comprehensive clearance workflow verifying dues, library returns, and academic standing.',
      steps_config: JSON.stringify([
        { step: 1, name: 'Accounts & Dues Verification', role: 'ACCOUNTANT', sla_hours: 24, escalate_to: 'HOD', can_reject: true, can_request_changes: true },
        { step: 2, name: 'Department HOD Recommendation', role: 'HOD', sla_hours: 24, escalate_to: 'PRINCIPAL', can_reject: true, can_request_changes: true },
        { step: 3, name: 'Principal Final Sanction', role: 'PRINCIPAL', sla_hours: 48, escalate_to: 'SUPER_ADMIN', can_reject: true, can_request_changes: false }
      ])
    },
    {
      id: 'wf-def-character',
      name: 'Character & Conduct Certificate Workflow',
      domain: 'CERTIFICATE',
      description: 'Official collegiate certificate attesting to student character and extracurricular contributions.',
      steps_config: JSON.stringify([
        { step: 1, name: 'Department HOD Conduct Check', role: 'HOD', sla_hours: 24, escalate_to: 'PRINCIPAL', can_reject: true, can_request_changes: true },
        { step: 2, name: 'Principal Sanction', role: 'PRINCIPAL', sla_hours: 24, escalate_to: 'SUPER_ADMIN', can_reject: true, can_request_changes: false }
      ])
    },
    {
      id: 'wf-def-faculty-leave',
      name: 'Faculty Leave Sanction Workflow',
      domain: 'FACULTY_LEAVE',
      description: 'Multi-tier faculty leave request with balance checking, department head sanction and executive approval.',
      steps_config: JSON.stringify([
        { step: 1, name: 'Department HOD Recommendation', role: 'HOD', sla_hours: 24, escalate_to: 'PRINCIPAL', can_reject: true, can_request_changes: true },
        { step: 2, name: 'Principal Executive Sanction', role: 'PRINCIPAL', sla_hours: 24, escalate_to: 'SUPER_ADMIN', can_reject: true, can_request_changes: true }
      ])
    },
    {
      id: 'wf-def-grievance',
      name: 'Student Grievance & Helpdesk Redressal Workflow',
      domain: 'GRIEVANCE',
      description: 'Standardized grievance tracking adhering to AICTE / UGC Ombudsman and Anti-Ragging regulations.',
      steps_config: JSON.stringify([
        { step: 1, name: 'Departmental Review & Redressal', role: 'HOD', sla_hours: 48, escalate_to: 'PRINCIPAL', can_reject: true, can_request_changes: true },
        { step: 2, name: 'Institutional Grievance Committee Sanction', role: 'PRINCIPAL', sla_hours: 72, escalate_to: 'SUPER_ADMIN', can_reject: true, can_request_changes: false }
      ])
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO workflow_definitions (id, name, domain, description, steps_config, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  for (const d of defs) {
    stmt.run(d.id, d.name, d.domain, d.description, d.steps_config);
  }
}

function seedSampleWorkflowInstances() {
  const count = db.prepare('SELECT COUNT(*) as c FROM workflow_instances').get().c;
  if (count > 0) return;

  const studentAarav = db.prepare("SELECT u.id as user_id, u.full_name, s.id as student_id, s.department_id FROM users u JOIN students s ON u.id = s.user_id WHERE u.username = 'stud_aarav'").get();
  const facultyMehta = db.prepare("SELECT u.id as user_id, u.full_name, f.id as faculty_id, f.department_id FROM users u JOIN faculty f ON u.id = f.user_id WHERE u.username = 'faculty_mehta'").get();

  if (studentAarav) {
    const instId = 'wfi-bonafide-001';
    db.prepare(`
      INSERT OR IGNORE INTO workflow_instances (
        id, definition_id, domain, entity_type, entity_id, title,
        requester_id, requester_name, requester_role, department_id,
        current_step, total_steps, current_assigned_role, status, priority,
        deadline_at, metadata_json
      ) VALUES (?, 'wf-def-bonafide', 'CERTIFICATE', 'CERTIFICATE_REQUEST', 'req-001', 'Bonafide Certificate for National Scholarship Portal',
        ?, ?, 'STUDENT', ?, 1, 2, 'HOD', 'IN_REVIEW', 'NORMAL',
        datetime('now', '+20 hours'), ?)
    `).run(
      instId,
      studentAarav.user_id,
      studentAarav.full_name,
      studentAarav.department_id,
      JSON.stringify({ certificateType: 'BONAFIDE_CERTIFICATE', purpose: 'National Scholarship Portal 2026 Verification', academicYear: '2025-26', semester: 'Semester 5' })
    );

    db.prepare(`
      INSERT OR IGNORE INTO workflow_step_logs (id, instance_id, step_number, action, actor_id, actor_name, actor_role, comments, previous_status, new_status)
      VALUES (?, ?, 1, 'SUBMITTED', ?, ?, 'STUDENT', 'Applied online via Student Self-Service Portal.', 'DRAFT', 'IN_REVIEW')
    `).run('log-bon-01', instId, studentAarav.user_id, studentAarav.full_name);
  }

  if (facultyMehta) {
    const instId = 'wfi-leave-001';
    db.prepare(`
      INSERT OR IGNORE INTO workflow_instances (
        id, definition_id, domain, entity_type, entity_id, title,
        requester_id, requester_name, requester_role, department_id,
        current_step, total_steps, current_assigned_role, status, priority,
        deadline_at, metadata_json
      ) VALUES (?, 'wf-def-faculty-leave', 'FACULTY_LEAVE', 'FACULTY_LEAVE', 'leave-001', 'Casual Leave (2 Days) - Family Emergency',
        ?, ?, 'FACULTY', ?, 1, 2, 'HOD', 'IN_REVIEW', 'HIGH',
        datetime('now', '+16 hours'), ?)
    `).run(
      instId,
      facultyMehta.user_id,
      facultyMehta.full_name,
      facultyMehta.department_id,
      JSON.stringify({ leaveType: 'CASUAL', startDate: '2026-10-28', endDate: '2026-10-29', daysCount: 2, reason: 'Family Emergency', substituteFaculty: 'Prof. Sandeep Patil' })
    );

    db.prepare(`
      INSERT OR IGNORE INTO workflow_step_logs (id, instance_id, step_number, action, actor_id, actor_name, actor_role, comments, previous_status, new_status)
      VALUES (?, ?, 1, 'SUBMITTED', ?, ?, 'FACULTY', 'Applied with lecture substitution arrangements.', 'DRAFT', 'IN_REVIEW')
    `).run('log-leave-01', instId, facultyMehta.user_id, facultyMehta.full_name);
  }
}

module.exports = {
  initWorkflowSchema
};
