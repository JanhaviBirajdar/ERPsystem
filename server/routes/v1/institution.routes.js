const express = require('express');
const router = express.Router();
const instController = require('../../controllers/institution.controller');
const { authenticate } = require('../../middleware/authenticate');
const { resolveTenant, requireTenant } = require('../../middleware/tenantContext');
const { authorize } = require('../../middleware/authorize');

// Public branding endpoint (for login screens & subdomains)
router.get('/public-branding/:subdomain', instController.getPublicBranding);

// Authenticated & Tenant-Scoped Endpoints
router.use(authenticate);
router.use(resolveTenant);

router.get('/', requireTenant, instController.getInstitution);
router.put('/', requireTenant, authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL']), instController.updateInstitution);

router.get('/branding', requireTenant, instController.getBranding);
router.put('/branding', requireTenant, authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL']), instController.updateBranding);

router.get('/academic-settings', requireTenant, instController.getAcademicSettings);
router.put('/academic-settings', requireTenant, authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL']), instController.updateAcademicSettings);

router.get('/all', authorize(['SUPER_ADMIN']), instController.getAllInstitutions);

module.exports = router;
