const express = require('express');
const router = express.Router();
const backupService = require('../../services/backupService');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN']));

// GET /api/v1/backups - List snapshots
router.get('/', (req, res) => {
  const backups = backupService.listBackups();
  res.json({
    success: true,
    data: {
      count: backups.length,
      backups
    }
  });
});

// POST /api/v1/backups/create - Create point-in-time snapshot
router.post('/create', async (req, res, next) => {
  try {
    const manifest = await backupService.createBackup(req.user.username || 'SUPER_ADMIN');
    res.status(201).json({
      success: true,
      message: 'Multi-tenant database snapshot successfully created and verified.',
      data: manifest
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/backups/:snapshotId/restore - Restore from snapshot
router.post('/:snapshotId/restore', async (req, res, next) => {
  try {
    const result = await backupService.restoreFromBackup(req.params.snapshotId, req.user.username || 'SUPER_ADMIN');
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
