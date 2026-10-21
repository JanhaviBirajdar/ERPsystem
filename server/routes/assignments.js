const express = require('express');
const router = express.Router();
const assignmentsCtrl = require('../controllers/assignments.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Assignment Routes
router.get('/', authenticate, assignmentsCtrl.getAssignments);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), assignmentsCtrl.createAssignment);
router.post('/:id/submit', authenticate, authorize(['STUDENT']), assignmentsCtrl.submitAssignment);
router.get('/:id/submissions', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), assignmentsCtrl.getSubmissions);
router.put('/submissions/:submissionId/grade', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), assignmentsCtrl.gradeSubmission);

// Study Material & Academic Resources Routes
router.get('/resources', authenticate, assignmentsCtrl.getResources);
router.post('/resources', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), assignmentsCtrl.createResource);

module.exports = router;
