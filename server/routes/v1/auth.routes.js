const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');
const { authenticate } = require('../../middleware/authenticate');
const { resolveTenant } = require('../../middleware/tenantContext');

router.use(resolveTenant);

router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/onboard-college', authController.onboardCollege);
router.get('/demo-personas', authController.getDemoPersonas);
router.post('/switch-persona', authController.switchPersona);

module.exports = router;
