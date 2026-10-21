const express = require('express');
const router = express.Router();
const auditController = require('../../controllers/audit.controller');
const { authenticate } = require('../../middleware/authenticate');
const { resolveTenant, requireTenant } = require('../../middleware/tenantContext');
const { authorize } = require('../../middleware/authorize');

router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenant);
router.use(authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL']));

router.get('/logs', auditController.getAuditLogs);

module.exports = router;
