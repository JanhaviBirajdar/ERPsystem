const db = require('../db/database');
const notificationService = require('./notificationService');
const documentService = require('./documentService');

const ALLOWED_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELLED'],
  IN_REVIEW: ['CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELLED'],
  CHANGES_REQUESTED: ['SUBMITTED', 'CANCELLED'],
  ESCALATED: ['IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: []
};

/**
 * Reusable Workflow Engine
 * State-machine, role authorization, multi-step progression, SLA deadline tracking,
 * automated escalation, reminders, audit logging in workflow_step_logs, and self-service integrations.
 */
class WorkflowEngine {
  /**
   * Validate if a status transition is permissible
   */
  validateTransition(currentStatus, targetStatus) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      const err = new Error(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Permissible transitions: ${
          allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'
        }`
      );
      err.statusCode = 400;
      throw err;
    }
    return true;
  }

  /**
   * Get workflow definition by ID
   */
  getDefinition(definitionId) {
    const def = db.prepare('SELECT * FROM workflow_definitions WHERE id = ? AND is_active = 1').get(definitionId);
    if (!def) {
      const err = new Error(`Workflow definition '${definitionId}' not found or inactive.`);
      err.statusCode = 404;
      throw err;
    }
    return {
      ...def,
      steps: JSON.parse(def.steps_config || '[]')
    };
  }

  /**
   * Start and submit a new workflow instance
   */
  async startWorkflow({
    definitionId,
    title,
    entityType,
    entityId,
    requesterUser,
    departmentId = null,
    priority = 'NORMAL',
    formData = {}
  }) {
    const def = this.getDefinition(definitionId);
    const steps = def.steps;
    if (!steps || steps.length === 0) {
      throw new Error(`Workflow definition '${definitionId}' has no configured steps.`);
    }

    const firstStep = steps[0];
    const instanceId = `wfi-${def.domain.toLowerCase().replace(/_/g, '-')}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const slaHours = firstStep.sla_hours || 24;
    const deadlineAt = new Date(Date.now() + slaHours * 3600000).toISOString();
    const targetDept = departmentId || requesterUser.department_id || null;

    db.prepare(`
      INSERT INTO workflow_instances (
        id, definition_id, domain, entity_type, entity_id, title,
        requester_id, requester_name, requester_role, department_id,
        current_step, total_steps, current_assigned_role, status, priority,
        deadline_at, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'IN_REVIEW', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      instanceId,
      def.id,
      def.domain,
      entityType || 'GENERAL_REQUEST',
      entityId || `ent-${Date.now()}`,
      title,
      requesterUser.id,
      requesterUser.full_name,
      requesterUser.role,
      targetDept,
      steps.length,
      firstStep.role,
      priority,
      deadlineAt,
      JSON.stringify(formData)
    );

    // Record submission in workflow_step_logs
    this.recordStepLog({
      instanceId,
      stepNumber: 1,
      action: 'SUBMITTED',
      actorUser: requesterUser,
      comments: 'Workflow request submitted via Self-Service Portal.',
      previousStatus: 'DRAFT',
      newStatus: 'IN_REVIEW'
    });

    // Notify approvers for Step 1
    await this.notifyApproversForStep({
      instanceId,
      step: firstStep,
      title,
      departmentId: targetDept,
      requesterName: requesterUser.full_name
    });

    return this.getInstance(instanceId);
  }

  /**
   * Validate whether a user has authority to approve or act on the current step
   */
  validateApproverPermission(instance, step, actorUser) {
    if (!actorUser) {
      const err = new Error('Authentication required.');
      err.statusCode = 401;
      throw err;
    }

    // Super Admin and Principal hold institutional override authority across all steps
    if (['SUPER_ADMIN', 'PRINCIPAL'].includes(actorUser.role)) {
      return true;
    }

    if (actorUser.role !== step.role) {
      const err = new Error(
        `Access denied: Role '${actorUser.role}' is not authorized for step '${step.name}'. Required role: '${step.role}'`
      );
      err.statusCode = 403;
      throw err;
    }

    // Department-scoped approval check for HOD
    if (actorUser.role === 'HOD') {
      if (actorUser.department_id && instance.department_id && actorUser.department_id !== instance.department_id) {
        const err = new Error(
          `Access denied: HODs can only approve requests from their own department.`
        );
        err.statusCode = 403;
        throw err;
      }
    }

    return true;
  }

  /**
   * Execute an action on a workflow instance (STEP_APPROVED / APPROVED, STEP_REJECTED / REJECTED, ESCALATED, CANCELLED)
   */
  async executeAction({ instanceId, action, actorUser, comments = '' }) {
    const validActions = ['APPROVED', 'STEP_APPROVED', 'REJECTED', 'STEP_REJECTED', 'ESCALATED', 'CANCELLED'];
    if (!validActions.includes(action)) {
      const err = new Error(`Invalid action '${action}'. Allowed: ${validActions.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const instance = this.getInstance(instanceId);
    if (!instance) {
      const err = new Error(`Workflow instance '${instanceId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const def = this.getDefinition(instance.definition_id);
    const steps = def.steps;
    // Current step in 1-based indexing
    const currentStepConfig = steps.find(s => s.step === instance.current_step) || steps[0];

    // Requesters can only CANCEL their own pending workflows
    if (action === 'CANCELLED') {
      if (instance.requester_id !== actorUser.id && !['SUPER_ADMIN', 'PRINCIPAL'].includes(actorUser.role)) {
        const err = new Error('Access denied: Only the requester or administrators can cancel this workflow.');
        err.statusCode = 403;
        throw err;
      }
      this.validateTransition(instance.status, 'CANCELLED');

      db.prepare(`
        UPDATE workflow_instances
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(instanceId);

      this.recordStepLog({
        instanceId,
        stepNumber: instance.current_step,
        action: 'CANCELLED',
        actorUser,
        comments: comments || 'Cancelled by requester',
        previousStatus: instance.status,
        newStatus: 'CANCELLED'
      });

      return this.getInstance(instanceId);
    }

    // For APPROVAL / REJECTION, check role and department permissions
    this.validateApproverPermission(instance, currentStepConfig, actorUser);

    if (action === 'REJECTED' || action === 'STEP_REJECTED') {
      this.validateTransition(instance.status, 'REJECTED');
      if (!comments) {
        const err = new Error('Rejection reason / comments are mandatory when rejecting a workflow request.');
        err.statusCode = 400;
        throw err;
      }

      db.prepare(`
        UPDATE workflow_instances
        SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(instanceId);

      this.recordStepLog({
        instanceId,
        stepNumber: instance.current_step,
        action: 'STEP_REJECTED',
        actorUser,
        comments,
        previousStatus: instance.status,
        newStatus: 'REJECTED'
      });

      // Notify requester
      await notificationService.notify({
        userId: instance.requester_id,
        category: 'WORKFLOW',
        priority: 'HIGH',
        title: `Workflow Request Rejected: ${instance.title}`,
        message: `Your request was rejected at '${currentStepConfig.name}'. Reason: ${comments}`,
        actionUrl: `/workflows?tab=self-service`
      });

      return this.getInstance(instanceId);
    }

    if (action === 'APPROVED' || action === 'STEP_APPROVED') {
      const isFinalStep = instance.current_step >= instance.total_steps;

      if (!isFinalStep) {
        // Multi-Step: Advance to next step
        const nextStepNumber = instance.current_step + 1;
        const nextStepConfig = steps.find(s => s.step === nextStepNumber) || steps[nextStepNumber - 1];
        const nextDeadline = new Date(Date.now() + (nextStepConfig.sla_hours || 24) * 3600000).toISOString();

        db.prepare(`
          UPDATE workflow_instances
          SET current_step = ?, current_assigned_role = ?, deadline_at = ?, status = 'IN_REVIEW', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(nextStepNumber, nextStepConfig.role, nextDeadline, instanceId);

        this.recordStepLog({
          instanceId,
          stepNumber: instance.current_step,
          action: 'STEP_APPROVED',
          actorUser,
          comments: comments || `Approved at Step ${instance.current_step} (${currentStepConfig.name}). Forwarded to Step ${nextStepNumber} (${nextStepConfig.name}).`,
          previousStatus: instance.status,
          newStatus: 'IN_REVIEW'
        });

        // Notify next step approvers
        await this.notifyApproversForStep({
          instanceId,
          step: nextStepConfig,
          title: instance.title,
          departmentId: instance.department_id,
          requesterName: instance.requester_name
        });

        return this.getInstance(instanceId);
      } else {
        // Final Step: Complete Workflow
        this.validateTransition(instance.status, 'APPROVED');

        db.prepare(`
          UPDATE workflow_instances
          SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(instanceId);

        this.recordStepLog({
          instanceId,
          stepNumber: instance.current_step,
          action: 'STEP_APPROVED',
          actorUser,
          comments: comments || 'Final approval granted. Workflow completed.',
          previousStatus: instance.status,
          newStatus: 'APPROVED'
        });

        // Post-approval side effects (generate document, update leave records, etc.)
        await this.handlePostApprovalLifecycle(instance, actorUser);

        // Notify requester
        await notificationService.notify({
          userId: instance.requester_id,
          category: 'WORKFLOW',
          priority: 'HIGH',
          title: `Request Approved: ${instance.title}`,
          message: `Your request has received final approval from ${actorUser.full_name} (${actorUser.role}).`,
          actionUrl: `/workflows?tab=self-service`
        });

        return this.getInstance(instanceId);
      }
    }

    if (action === 'ESCALATED') {
      this.validateTransition(instance.status, 'ESCALATED');

      db.prepare(`
        UPDATE workflow_instances
        SET status = 'ESCALATED', escalated = 1, escalated_to_role = ?, escalation_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(currentStepConfig.escalate_to || 'PRINCIPAL', comments || 'Manual administrative escalation', instanceId);

      this.recordStepLog({
        instanceId,
        stepNumber: instance.current_step,
        action: 'ESCALATED',
        actorUser,
        comments: comments || 'Escalated to higher authority.',
        previousStatus: instance.status,
        newStatus: 'ESCALATED'
      });

      return this.getInstance(instanceId);
    }
  }

  /**
   * Post-approval automated side-effects
   */
  async handlePostApprovalLifecycle(instance, approverUser) {
    const meta = JSON.parse(instance.metadata_json || '{}');

    // 1. Certificate generation
    if (instance.domain === 'CERTIFICATE') {
      const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(instance.requester_id);
      const certType = meta.certificateType || (
        instance.definition_id === 'wf-def-leaving' ? 'LEAVING_CERTIFICATE' :
        instance.definition_id === 'wf-def-character' ? 'CHARACTER_CERTIFICATE' :
        'BONAFIDE_CERTIFICATE'
      );

      const generatedDoc = await documentService.generateDocument({
        templateType: certType,
        title: `${certType.replace(/_/g, ' ')} - ${instance.requester_name}`,
        workflowInstanceId: instance.id,
        ownerUserId: instance.requester_id,
        studentId: student ? student.id : null,
        departmentId: instance.department_id,
        metadata: {
          prn: meta.prn || (student ? student.prn : 'N/A'),
          purpose: meta.purpose || 'Official Verification',
          academicYear: meta.academicYear || '2025-26',
          semester: meta.semester || 'Current Semester'
        },
        issuedByUserId: approverUser.id,
        issuedByName: approverUser.full_name
      });

      // Link generated document to instance
      db.prepare('UPDATE workflow_instances SET generated_doc_id = ? WHERE id = ?').run(generatedDoc.id, instance.id);

      this.recordStepLog({
        instanceId: instance.id,
        stepNumber: instance.current_step,
        action: 'DOCUMENT_GENERATED',
        actorUser: approverUser,
        comments: `Generated official ${certType} with Doc No. ${generatedDoc.documentNumber} and verification code ${generatedDoc.verificationCode}`,
        previousStatus: 'APPROVED',
        newStatus: 'APPROVED'
      });
    }

    // 2. Faculty Leave: update faculty_leaves table if linked
    if (instance.domain === 'FACULTY_LEAVE' && instance.entity_id) {
      db.prepare('UPDATE faculty_leaves SET status = ?, approved_by = ? WHERE id = ?').run('APPROVED', approverUser.id, instance.entity_id);
    }

    // 3. Grievance: update service_desk_tickets table if linked
    if (instance.domain === 'GRIEVANCE' && instance.entity_id) {
      db.prepare("UPDATE service_desk_tickets SET status = 'APPROVED', resolution_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run('Resolved by Grievance Redressal Committee.', instance.entity_id);
    }
  }

  /**
   * Helper to write audit logs in workflow_step_logs
   */
  recordStepLog({ instanceId, stepNumber, action, actorUser, comments = '', previousStatus, newStatus }) {
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO workflow_step_logs (
        id, instance_id, step_number, action, actor_id, actor_name, actor_role, comments, previous_status, new_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      instanceId,
      stepNumber,
      action,
      actorUser ? actorUser.id : 'SYSTEM',
      actorUser ? actorUser.full_name : 'System Scheduler',
      actorUser ? actorUser.role : 'SYSTEM',
      comments,
      previousStatus,
      newStatus
    );
  }

  /**
   * Notify approvers for a given step
   */
  async notifyApproversForStep({ instanceId, step, title, departmentId, requesterName }) {
    let query = 'SELECT id, full_name, email FROM users WHERE role = ? AND is_active = 1';
    const params = [step.role];

    if (step.role === 'HOD' && departmentId) {
      query += " AND (department_id = ? OR role = 'SUPER_ADMIN')";
      params.push(departmentId);
    }

    const approvers = db.prepare(query).all(...params);
    for (const appr of approvers) {
      const idempotencyKey = `step-notify-${instanceId}-${step.step}-${appr.id}`;
      await notificationService.notify({
        userId: appr.id,
        category: 'APPROVAL_REQUIRED',
        priority: 'HIGH',
        title: `Approval Needed: ${title}`,
        message: `${requesterName} submitted a request requiring your review for '${step.name}'.`,
        actionUrl: `/workflows?tab=inbox`,
        idempotencyKey
      });
    }
  }

  /**
   * Process SLA deadlines, escalations and reminders
   */
  async processWorkflowDeadlinesAndReminders() {
    const pending = db.prepare(`
      SELECT w.*, def.steps_config
      FROM workflow_instances w
      JOIN workflow_definitions def ON w.definition_id = def.id
      WHERE w.status IN ('SUBMITTED', 'IN_REVIEW')
    `).all();

    let escalationsCount = 0;
    let remindersCount = 0;

    for (const wf of pending) {
      const steps = JSON.parse(wf.steps_config || '[]');
      const currentStepConfig = steps.find(s => s.step === wf.current_step) || steps[0];
      const deadline = new Date(wf.deadline_at);
      const isPastDeadline = deadline.getTime() < Date.now();

      // Escalation check
      if (isPastDeadline && wf.status !== 'ESCALATED') {
        const escalateToRole = currentStepConfig.escalate_to || 'PRINCIPAL';

        db.prepare(`
          UPDATE workflow_instances
          SET status = 'ESCALATED', escalated = 1, escalated_to_role = ?,
              escalation_reason = 'Automated SLA breach: Step deadline expired',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(escalateToRole, wf.id);

        this.recordStepLog({
          instanceId: wf.id,
          stepNumber: wf.current_step,
          action: 'ESCALATED',
          actorUser: null,
          comments: `Automatic SLA Escalation: Step deadline expired at ${wf.deadline_at}. Escalated to ${escalateToRole}.`,
          previousStatus: wf.status,
          newStatus: 'ESCALATED'
        });

        // Notify executive role
        const executives = db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').all(escalateToRole);
        for (const exec of executives) {
          await notificationService.notify({
            userId: exec.id,
            category: 'ESCALATION',
            priority: 'URGENT',
            title: `⚠️ SLA Escalation: ${wf.title}`,
            message: `Workflow #${wf.id} (${wf.requester_name}) breached SLA deadline for '${currentStepConfig.name}'. Escalated for immediate intervention.`,
            actionUrl: `/workflows?tab=inbox`,
            idempotencyKey: `escalate-${wf.id}-${wf.current_step}-${exec.id}`
          });
        }
        escalationsCount++;
      } else if (!isPastDeadline) {
        // Approaching deadline reminder: within 12 hours
        const hoursLeft = (deadline.getTime() - Date.now()) / (1000 * 3600);
        if (hoursLeft <= 12) {
          const approvers = db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').all(wf.current_assigned_role);
          for (const appr of approvers) {
            const idempotencyKey = `reminder-${wf.id}-${wf.current_step}-${Math.floor(Date.now() / (1000 * 3600 * 12))}-${appr.id}`;
            const result = await notificationService.notify({
              userId: appr.id,
              category: 'REMINDER',
              priority: 'HIGH',
              title: `⏰ Reminder: Pending Approval for ${wf.title}`,
              message: `Step '${currentStepConfig.name}' has ${Math.round(hoursLeft)}h remaining before automatic escalation.`,
              actionUrl: `/workflows?tab=inbox`,
              idempotencyKey
            });

            if (!result.duplicatePrevented) {
              remindersCount++;
            }
          }
        }
      }
    }

    return {
      processedTotal: pending.length,
      escalationsCount,
      remindersCount
    };
  }

  /**
   * Get single instance with full steps, logs, and metadata
   */
  getInstance(instanceId) {
    const inst = db.prepare(`
      SELECT w.*, def.name as workflow_name, def.domain, def.description as workflow_description,
             def.steps_config, d.name as department_name, d.code as department_code
      FROM workflow_instances w
      JOIN workflow_definitions def ON w.definition_id = def.id
      LEFT JOIN departments d ON w.department_id = d.id
      WHERE w.id = ?
    `).get(instanceId);

    if (!inst) return null;

    const stepLogs = db.prepare(`
      SELECT * FROM workflow_step_logs
      WHERE instance_id = ?
      ORDER BY created_at ASC
    `).all(instanceId);

    return {
      ...inst,
      metadata: JSON.parse(inst.metadata_json || '{}'),
      steps: JSON.parse(inst.steps_config || '[]'),
      stepLogs
    };
  }

  /**
   * Centralized Approval Inbox for Staff
   */
  getInboxForUser(user) {
    const allPending = db.prepare(`
      SELECT w.*, def.name as workflow_name, def.steps_config,
             d.name as department_name, d.code as department_code
      FROM workflow_instances w
      JOIN workflow_definitions def ON w.definition_id = def.id
      LEFT JOIN departments d ON w.department_id = d.id
      WHERE w.status IN ('SUBMITTED', 'IN_REVIEW', 'ESCALATED')
      ORDER BY 
        CASE WHEN w.status = 'ESCALATED' THEN 0 ELSE 1 END,
        CASE WHEN w.priority = 'URGENT' THEN 0 WHEN w.priority = 'HIGH' THEN 1 ELSE 2 END,
        w.deadline_at ASC
    `).all();

    const filtered = allPending.filter(item => {
      if (['SUPER_ADMIN', 'PRINCIPAL'].includes(user.role)) return true;

      if (item.current_assigned_role !== user.role) return false;

      if (user.role === 'HOD' && user.department_id && item.department_id) {
        if (user.department_id !== item.department_id) return false;
      }

      return true;
    });

    return filtered.map(item => {
      const steps = JSON.parse(item.steps_config || '[]');
      return {
        ...item,
        metadata: JSON.parse(item.metadata_json || '{}'),
        currentStepConfig: steps.find(s => s.step === item.current_step) || steps[0] || {}
      };
    });
  }

  /**
   * Student Self-Service Hub
   */
  getStudentSelfService(userId) {
    const student = db.prepare(`
      SELECT s.*, d.name as department_name, d.code as department_code, sem.number as semester_number
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.user_id = ?
    `).get(userId);

    const workflows = db.prepare(`
      SELECT w.*, def.name as workflow_name, def.steps_config
      FROM workflow_instances w
      JOIN workflow_definitions def ON w.definition_id = def.id
      WHERE w.requester_id = ?
      ORDER BY w.created_at DESC
    `).all(userId);

    const mapped = workflows.map(w => ({
      ...w,
      metadata: JSON.parse(w.metadata_json || '{}'),
      steps: JSON.parse(w.steps_config || '[]')
    }));

    const documents = documentService.getUserDocuments(userId);

    return {
      student,
      workflows: mapped,
      documents
    };
  }

  /**
   * Faculty Self-Service Hub
   */
  getFacultySelfService(userId) {
    const faculty = db.prepare(`
      SELECT f.*, d.name as department_name, d.code as department_code
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.user_id = ?
    `).get(userId);

    if (!faculty) return null;

    const leaveRequests = db.prepare(`
      SELECT w.*, def.name as workflow_name, def.steps_config
      FROM workflow_instances w
      JOIN workflow_definitions def ON w.definition_id = def.id
      WHERE w.requester_id = ? AND w.domain = 'FACULTY_LEAVE'
      ORDER BY w.created_at DESC
    `).all(userId);

    const mappedLeaves = leaveRequests.map(w => ({
      ...w,
      metadata: JSON.parse(w.metadata_json || '{}'),
      steps: JSON.parse(w.steps_config || '[]')
    }));

    // Calculate balances from leaves taken
    const approvedCasual = db.prepare(`
      SELECT COUNT(*) as c FROM workflow_instances
      WHERE requester_id = ? AND domain = 'FACULTY_LEAVE' AND status = 'APPROVED'
    `).get(userId).c;

    return {
      faculty,
      balances: {
        casual_total: 12,
        casual_used: Math.min(approvedCasual * 2, 12),
        casual_remaining: Math.max(12 - (approvedCasual * 2), 0),
        medical_total: 10,
        medical_used: 1,
        medical_remaining: 9,
        earned_total: 15,
        earned_used: 3,
        earned_remaining: 12
      },
      leaveRequests: mappedLeaves
    };
  }
}

module.exports = new WorkflowEngine();
