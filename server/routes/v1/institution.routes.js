const express = require('express');
const router = express.Router();
const instController = require('../../controllers/institution.controller');
const { authenticate } = require('../../middleware/authenticate');
const { resolveTenant, requireTenant } = require('../../middleware/tenantContext');
const { authorize } = require('../../middleware/authorize');

router.use(authenticate);
router.use(resolveTenant);

router.get('/', requireTenant, instController.getInstitution);
router.put('/', requireTenant, authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL']), instController.updateInstitution);
router.get('/all', authorize(['SUPER_ADMIN']), instController.getAllInstitutions);

module.exports = router;
