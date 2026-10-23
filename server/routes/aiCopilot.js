const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');
const aiCopilotService = require('../services/aiCopilotService');

// POST /api/ai/chat - AI Campus Copilot Query Engine (Strictly Role-Scoped)
router.post('/chat', authenticate, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const result = await aiCopilotService.processQuery({
      prompt,
      user: req.user,
      req
    });

    logAudit(
      req.user.id,
      req.user.role,
      result.securityViolation ? 'AI_COPILOT_SECURITY_VIOLATION' : 'AI_COPILOT_QUERY',
      'AI_COPILOT',
      result.toolName || 'CHAT',
      { category: result.category, securityViolation: Boolean(result.securityViolation) },
      req
    );

    res.json(result);
  } catch (err) {
    console.error('AI Copilot error:', err);
    res.status(500).json({
      error: 'AI Copilot encountered an error processing the question',
      fallback: 'Data service temporarily busy. Please navigate using the sidebar modules.'
    });
  }
});

// POST /api/ai/confirm-action - Confirm and execute consequential actions
router.post('/confirm-action', authenticate, async (req, res, next) => {
  try {
    const { actionId, confirmed = true } = req.body;
    if (!actionId) {
      return res.status(400).json({ error: 'actionId is required' });
    }

    const result = await aiCopilotService.confirmAction({
      actionId,
      user: req.user,
      confirmed
    });

    logAudit(req.user.id, req.user.role, 'AI_CONFIRM_ACTION', 'AI_COPILOT', actionId, { confirmed }, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// GET /api/ai/telemetry - Telemetry & Security audit logs for administrators
router.get('/telemetry', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM ai_usage_logs
    ORDER BY created_at DESC LIMIT 100
  `).all();

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_queries,
      SUM(CASE WHEN security_flag != 'CLEAN' THEN 1 ELSE 0 END) as security_violations,
      ROUND(AVG(latency_ms), 1) as avg_latency_ms
    FROM ai_usage_logs
  `).get();

  res.json({
    summary: stats,
    logs
  });
});

module.exports = router;
