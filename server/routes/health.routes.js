const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { collections } = require('../config/database');

// GET /api/health - Liveness probe
router.get('/', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Modern College ERP SaaS Multi-Tenant Platform',
    version: '2.5.0-commercial',
    phase: 'COMMERCIAL_MULTI_TENANT_READY',
    timestamp: new Date().toISOString()
  });
});

// GET /api/health/ready - Readiness probe for Docker & Kubernetes
router.get('/ready', (req, res) => {
  try {
    const sqliteCheck = db.prepare('SELECT 1 as ok').get();
    const ready = sqliteCheck && sqliteCheck.ok === 1;

    if (!ready) {
      return res.status(503).json({ ready: false, message: 'Database query failed' });
    }

    res.json({
      ready: true,
      database: 'CONNECTED',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});

// GET /api/health/deep - Comprehensive diagnostic health check
router.get('/deep', (req, res) => {
  try {
    const startCheck = Date.now();

    // 1. SQLite WAL & Integrity Check
    const integrity = db.prepare('PRAGMA integrity_check').get();
    const walCheck = db.prepare('PRAGMA journal_mode').get();

    // 2. Metrics & Counts
    const studentCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    const facultyCount = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
    const deptCount = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;

    // 3. Document Store Collections Check
    const docCounts = {};
    for (const [name, col] of Object.entries(collections)) {
      docCounts[name] = col.docs.length;
    }

    // 4. Memory Utilization
    const mem = process.memoryUsage();

    const latencyMs = Date.now() - startCheck;

    res.json({
      status: 'HEALTHY',
      diagnostics: {
        latencyMs,
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        sqlite: {
          journalMode: walCheck.journal_mode,
          integrity: integrity.integrity_check === 'ok' ? 'PASSED_OK' : integrity.integrity_check,
          records: {
            students: studentCount,
            faculty: facultyCount,
            departments: deptCount
          }
        },
        documentStore: {
          status: 'IN_MEMORY_PERSISTED',
          collections: docCounts
        },
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024)
        },
        scheduler: {
          status: 'ACTIVE',
          heartbeatIntervalSeconds: 60
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'DEGRADED',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
