const express = require('express');
const router = express.Router();
const admissionsCtrl = require('../controllers/admissions.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// Public or Student/Parent endpoint to submit application
router.post('/applications', admissionsCtrl.createApplication);

// Protected endpoints for Admission Office, Principal, and Admins
router.get(
  '/applications',
  authenticate,
  authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ADMISSION_OFFICER', 'ACCOUNTANT']),
  admissionsCtrl.getApplications
);

router.put(
  '/applications/:id/verify-documents',
  authenticate,
  authorize(['SUPER_ADMIN', 'PRINCIPAL', 'ADMISSION_OFFICER']),
  admissionsCtrl.verifyDocuments
);

router.put(
  '/applications/:id/check-eligibility',
  authenticate,
  authorize(['SUPER_ADMIN', 'PRINCIPAL', 'ADMISSION_OFFICER']),
  admissionsCtrl.checkEligibility
);

router.put(
  '/applications/:id/approve',
  authenticate,
  authorize(['SUPER_ADMIN', 'PRINCIPAL', 'ADMISSION_OFFICER']),
  admissionsCtrl.approveApplication
);

router.post(
  '/applications/:id/enroll',
  authenticate,
  authorize(['SUPER_ADMIN', 'PRINCIPAL', 'ADMISSION_OFFICER']),
  admissionsCtrl.enrollApplicant
);

router.get(
  '/reports',
  authenticate,
  authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ADMISSION_OFFICER']),
  admissionsCtrl.getAdmissionReports
);

module.exports = router;
