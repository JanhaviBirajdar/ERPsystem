const express = require('express');
const router = express.Router();
const acadController = require('../../controllers/academicConfig.controller');
const { authenticate } = require('../../middleware/authenticate');
const { resolveTenant, requireTenant } = require('../../middleware/tenantContext');
const { authorize } = require('../../middleware/authorize');

router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenant);

// Academic Years
router.get('/years', acadController.getAcademicYears);
router.post('/years', authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN']), acadController.createAcademicYear);

// Departments
router.get('/departments', acadController.getDepartments);
router.post('/departments', authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN']), acadController.createDepartment);
router.put('/departments/:id', authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'HOD']), acadController.updateDepartment);

// Semesters
router.get('/semesters', acadController.getSemesters);
router.post('/semesters', authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN']), acadController.createSemester);

// Courses / Subjects
router.get('/courses', acadController.getCourses);
router.post('/courses', authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'HOD']), acadController.createCourse);

// Divisions
router.get('/divisions', acadController.getDivisions);
router.post('/divisions', authorize(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'HOD']), acadController.createDivision);

module.exports = router;
