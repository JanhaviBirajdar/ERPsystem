const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');
const workflowEngine = require('../services/workflowEngine');
const notificationService = require('../services/notificationService');
const documentService = require('../services/documentService');
const schedulerService = require('../services/schedulerService');

// ============================================================================
// 1. WORKFLOW DEFINITIONS & STEP CONFIGURATION
// ============================================================================

// GET /api/workflows/definitions - List workflow definitions
router.get('/definitions', authenticate, (req, res) => {
  const definitions = db.prepare('SELECT * FROM workflow_definitions WHERE is_active = 1').all();
  const parsed = definitions.map(d => ({
    ...d,
    steps: JSON.parse(d.steps_config || '[]')
  }));
  res.json({ definitions: parsed });
});

// PUT /api/workflows/definitions/:id - Update steps config & SLA
router.put('/definitions/:id', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  const { steps, name, description } = req.body;
  const existing = db.prepare('SELECT * FROM workflow_definitions WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: `Workflow definition '${req.params.id}' not found` });
  }

  db.prepare(`
    UPDATE workflow_definitions
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        steps_config = COALESCE(?, steps_config)
    WHERE id = ?
  `).run(name, description, steps ? JSON.stringify(steps) : null, req.params.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_WORKFLOW_DEF', 'WORKFLOW_DEF', req.params.id, { name, stepsCount: steps ? steps.length : null }, req);
  res.json({ success: true, message: `Workflow '${req.params.id}' updated successfully` });
});

// ============================================================================
// 2. WORKFLOW INSTANCES & ACTIONS
// ============================================================================

// GET /api/workflows/instances - List workflow instances
router.get('/instances', authenticate, (req, res) => {
  const { status, domain, requester_id, department_id, limit = 50 } = req.query;
  let query = `
    SELECT w.*, def.name as workflow_name, def.steps_config,
           d.name as department_name, d.code as department_code
    FROM workflow_instances w
    JOIN workflow_definitions def ON w.definition_id = def.id
    LEFT JOIN departments d ON w.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (['STUDENT', 'FACULTY'].includes(req.user.role)) {
    query += ' AND w.requester_id = ?';
    params.push(req.user.id);
  } else if (requester_id) {
    query += ' AND w.requester_id = ?';
    params.push(requester_id);
  }

  if (status) {
    query += ' AND w.status = ?';
    params.push(status);
  }

  if (domain) {
    query += ' AND w.domain = ?';
    params.push(domain);
  }

  if (department_id) {
    query += ' AND w.department_id = ?';
    params.push(department_id);
  }

  query += ' ORDER BY w.created_at DESC LIMIT ?';
  params.push(Number(limit));

  const items = db.prepare(query).all(...params);
  const mapped = items.map(i => ({
    ...i,
    metadata: JSON.parse(i.metadata_json || '{}'),
    steps: JSON.parse(i.steps_config || '[]')
  }));

  res.json({ count: mapped.length, instances: mapped });
});

// GET /api/workflows/instances/:id - Full details + audit step logs
router.get('/instances/:id', authenticate, (req, res) => {
  const instance = workflowEngine.getInstance(req.params.id);
  if (!instance) {
    return res.status(404).json({ error: 'Workflow instance not found' });
  }

  if (
    ['STUDENT', 'FACULTY'].includes(req.user.role) &&
    instance.requester_id !== req.user.id &&
    !['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(req.user.role)
  ) {
    return res.status(403).json({ error: 'Access denied: You are not authorized to view this request.' });
  }

  res.json({ instance });
});

// POST /api/workflows/instances - Start new workflow request
router.post('/instances', authenticate, async (req, res, next) => {
  try {
    const { definition_id, title, entity_type, entity_id, priority, formData } = req.body;
    if (!definition_id || !title) {
      return res.status(400).json({ error: 'definition_id and title are required' });
    }

    const instance = await workflowEngine.startWorkflow({
      definitionId: definition_id,
      title,
      entityType: entity_type || 'GENERAL_REQUEST',
      entityId: entity_id || `ent-${Date.now()}`,
      requesterUser: req.user,
      departmentId: req.user.department_id,
      priority: priority || 'NORMAL',
      formData: formData || {}
    });

    logAudit(req.user.id, req.user.role, 'SUBMIT_WORKFLOW', 'WORKFLOW', instance.id, { definition_id, title }, req);
    res.status(201).json({ success: true, message: 'Workflow request submitted successfully', instance });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// PUT /api/workflows/instances/:id/action - Execute step action (APPROVED, REJECTED, ESCALATED, CANCELLED)
router.put('/instances/:id/action', authenticate, async (req, res, next) => {
  try {
    const { action, comments } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'action (APPROVED, REJECTED, ESCALATED, CANCELLED) is required' });
    }

    const updatedInstance = await workflowEngine.executeAction({
      instanceId: req.params.id,
      action,
      actorUser: req.user,
      comments: comments || ''
    });

    logAudit(req.user.id, req.user.role, `WORKFLOW_${action}`, 'WORKFLOW', req.params.id, { action, comments }, req);
    res.json({
      success: true,
      message: `Workflow ${action.toLowerCase()} successfully`,
      instance: updatedInstance
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// ============================================================================
// 3. CENTRALIZED APPROVAL INBOX
// ============================================================================

// GET /api/workflows/inbox - Fetch items pending action by current staff member
router.get('/inbox', authenticate, (req, res) => {
  const inbox = workflowEngine.getInboxForUser(req.user);
  res.json({
    count: inbox.length,
    inbox
  });
});

// ============================================================================
// 4. STUDENT & FACULTY SELF-SERVICE DASHBOARDS
// ============================================================================

// GET /api/workflows/self-service/student - Student self-service hub
router.get('/self-service/student', authenticate, (req, res) => {
  let targetUserId = req.user.id;
  if (['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(req.user.role) && req.query.user_id) {
    targetUserId = req.query.user_id;
  }

  const data = workflowEngine.getStudentSelfService(targetUserId);
  res.json(data);
});

// GET /api/workflows/self-service/faculty - Faculty self-service hub
router.get('/self-service/faculty', authenticate, (req, res) => {
  let targetUserId = req.user.id;
  if (['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(req.user.role) && req.query.user_id) {
    targetUserId = req.query.user_id;
  }

  const data = workflowEngine.getFacultySelfService(targetUserId);
  if (!data) {
    return res.status(404).json({ error: 'Faculty profile not found for this user' });
  }
  res.json(data);
});

// ============================================================================
// 5. OFFICIAL DOCUMENTS & CRYPTOGRAPHIC VERIFICATION
// ============================================================================

// GET /api/workflows/documents/:id - Secure Document Retrieval
router.get('/documents/:id', authenticate, (req, res) => {
  try {
    const doc = documentService.getDocumentById(req.params.id, req.user);
    res.json({ document: doc });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// GET /api/workflows/documents/verify/:code - Public Cryptographic Verification
router.get('/documents/verify/:code', (req, res) => {
  const result = documentService.verifyDocumentByCode(req.params.code);
  if (!result.valid) {
    return res.status(404).json(result);
  }
  res.json(result);
});

// ============================================================================
// 6. SEARCHABLE NOTIFICATION CENTER
// ============================================================================

// GET /api/workflows/notifications - Search & list notifications
router.get('/notifications', authenticate, (req, res) => {
  const { category, unread, search, limit = 50, offset = 0 } = req.query;
  const result = notificationService.getUserNotifications(req.user, {
    category,
    unreadOnly: unread === 'true' || unread === '1',
    search,
    limit: Number(limit),
    offset: Number(offset)
  });

  res.json(result);
});

// PUT /api/workflows/notifications/:id/read - Mark single notification as read
router.put('/notifications/:id/read', authenticate, (req, res) => {
  notificationService.markAsRead(req.params.id, req.user.id);
  res.json({ success: true });
});

// PUT /api/workflows/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticate, (req, res) => {
  notificationService.markAllAsRead(req.user.id, req.user.role);
  res.json({ success: true, message: 'All notifications marked as read' });
});

// ============================================================================
// 7. DEPARTMENT ANNOUNCEMENTS & TARGETED NOTICES
// ============================================================================

// GET /api/workflows/announcements - List announcements
router.get('/announcements', authenticate, (req, res) => {
  let query = 'SELECT * FROM department_announcements WHERE 1=1';
  const params = [];

  if (req.user.role === 'STUDENT') {
    query += " AND (target_audience IN ('ALL', 'STUDENTS') OR department_id = 'ALL' OR department_id = ?)";
    params.push(req.user.department_id || '');
  } else if (['FACULTY', 'HOD'].includes(req.user.role)) {
    query += " AND (target_audience IN ('ALL', 'FACULTY', 'HOD') OR department_id = 'ALL' OR department_id = ?)";
    params.push(req.user.department_id || '');
  }

  query += ' ORDER BY is_pinned DESC, created_at DESC LIMIT 50';
  const announcements = db.prepare(query).all(...params);
  res.json({ count: announcements.length, announcements });
});

// POST /api/workflows/announcements - Publish targeted announcement
router.post('/announcements', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD']), async (req, res, next) => {
  try {
    const { title, content, target_audience, category, is_pinned, department_id, priority, expires_at } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const targetDept = department_id || (req.user.role === 'HOD' ? req.user.department_id : 'ALL');
    const result = await notificationService.publishAnnouncement({
      title,
      content,
      departmentId: targetDept,
      targetAudience: target_audience || 'ALL',
      priority: priority || 'NORMAL',
      category: category || 'ACADEMIC',
      publishedByUserId: req.user.id,
      publishedByName: req.user.full_name,
      isPinned: is_pinned,
      expiresAt: expires_at || null
    });

    logAudit(req.user.id, req.user.role, 'PUBLISH_ANNOUNCEMENT', 'ANNOUNCEMENT', result.announcementId, { title, target_audience }, req);

    res.status(201).json({
      success: true,
      message: 'Announcement published and broadcast successfully',
      announcementId: result.announcementId,
      recipientsNotified: result.recipientsNotified
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 8. SCHEDULED INSTITUTIONAL REPORTS & EXPORTS
// ============================================================================

// GET /api/workflows/reports - Generate report (JSON or CSV)
router.get('/reports', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT']), async (req, res, next) => {
  try {
    const { report_type = 'WORKFLOW_COMPLIANCE_DAILY', format = 'json' } = req.query;
    const reportData = await schedulerService.generateReportData(report_type);

    if (format.toLowerCase() === 'csv') {
      const csv = schedulerService.exportToCsv(report_type, reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report_type.toLowerCase()}_report.csv"`);
      return res.send(csv);
    }

    res.json({ report: reportData });
  } catch (err) {
    next(err);
  }
});

// GET /api/workflows/reports/scheduled - List scheduled report logs
router.get('/reports/scheduled', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  const jobs = db.prepare('SELECT * FROM scheduled_reports ORDER BY generated_at DESC LIMIT 50').all();
  res.json({ jobs });
});

// ============================================================================
// 9. SCHEDULER TICK (ON-DEMAND SLA ESCALATION & REMINDERS)
// ============================================================================

// POST /api/workflows/scheduler/tick - On-demand trigger for testing
router.post('/scheduler/tick', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res, next) => {
  try {
    const tickResult = await schedulerService.runTick();
    res.json({ success: true, message: 'Scheduler tick executed successfully', result: tickResult });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
