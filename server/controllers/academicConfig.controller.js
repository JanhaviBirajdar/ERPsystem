const { getCollection, createObjectId } = require('../config/database');
const { scopeQuery } = require('../middleware/tenantContext');
const { recordAuditLog } = require('../middleware/auditLogger');

// -------------------------------------------------------------
// 1. ACADEMIC YEARS
// -------------------------------------------------------------
const getAcademicYears = async (req, res, next) => {
  try {
    const col = getCollection('academic_years');
    const filter = scopeQuery({}, req);
    const years = await col.find(filter, { sort: { isCurrent: -1, name: -1 } });
    res.json({ success: true, data: { years } });
  } catch (err) {
    next(err);
  }
};

const createAcademicYear = async (req, res, next) => {
  try {
    const { name, isCurrent, startDate, endDate } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELD', message: 'Academic year name (e.g. 2026-2027) is required.' }
      });
    }

    const col = getCollection('academic_years');

    // If marked current, deactivate other years in this tenant
    if (isCurrent) {
      const allYears = await col.find(scopeQuery({}, req));
      for (const y of allYears) {
        await col.updateOne({ _id: y._id }, { $set: { isCurrent: false } });
      }
    }

    const doc = await col.insertOne({
      _id: createObjectId(),
      tenantId: req.tenantId,
      name,
      isCurrent: !!isCurrent,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date()
    });

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'CREATE_ACADEMIC_YEAR', 'ACADEMIC_YEAR', doc._id, { name }, req);
    res.status(201).json({ success: true, message: 'Academic year created', data: { academicYear: doc } });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 2. DEPARTMENTS
// -------------------------------------------------------------
const getDepartments = async (req, res, next) => {
  try {
    const col = getCollection('departments');
    const filter = scopeQuery({}, req);
    const departments = await col.find(filter, { sort: { code: 1 } });
    res.json({ success: true, data: { count: departments.length, departments } });
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { code, name, hodName, hodEmail, intakeCapacity, establishedYear } = req.body;
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Department code and name are required.' }
      });
    }

    const col = getCollection('departments');

    // Ensure code is unique within this tenant
    const existing = await col.findOne(scopeQuery({ code: code.toUpperCase().trim() }, req));
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DEPARTMENT_CODE_EXISTS', message: `Department with code '${code}' already exists in your college.` }
      });
    }

    const doc = await col.insertOne({
      _id: createObjectId(),
      tenantId: req.tenantId,
      code: code.toUpperCase().trim(),
      name: name.trim(),
      hodName: hodName || null,
      hodEmail: hodEmail || null,
      intakeCapacity: parseInt(intakeCapacity) || 60,
      establishedYear: parseInt(establishedYear) || 2026
    });

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'CREATE_DEPARTMENT', 'DEPARTMENT', doc._id, { code, name }, req);
    res.status(201).json({ success: true, message: 'Department created', data: { department: doc } });
  } catch (err) {
    next(err);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const col = getCollection('departments');
    const deptId = req.params.id;

    // Strict Tenant Isolation: Find department scoped to current tenant
    const dept = await col.findOne(scopeQuery({ _id: deptId }, req));
    if (!dept) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Department not found in your institution.' }
      });
    }

    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.hodName) updateFields.hodName = req.body.hodName;
    if (req.body.hodEmail) updateFields.hodEmail = req.body.hodEmail;
    if (req.body.intakeCapacity) updateFields.intakeCapacity = parseInt(req.body.intakeCapacity);

    await col.updateOne({ _id: deptId }, { $set: updateFields });
    const updated = await col.findById(deptId);

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'UPDATE_DEPARTMENT', 'DEPARTMENT', deptId, updateFields, req);
    res.json({ success: true, message: 'Department updated', data: { department: updated } });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 3. SEMESTERS
// -------------------------------------------------------------
const getSemesters = async (req, res, next) => {
  try {
    const col = getCollection('semesters');
    const filter = scopeQuery({}, req);
    const semesters = await col.find(filter, { sort: { number: 1 } });
    res.json({ success: true, data: { count: semesters.length, semesters } });
  } catch (err) {
    next(err);
  }
};

const createSemester = async (req, res, next) => {
  try {
    const { number, term, academicYearId, isActive } = req.body;
    if (!number || !term) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Semester number (1-8) and term (ODD/EVEN) are required.' }
      });
    }

    const col = getCollection('semesters');
    const doc = await col.insertOne({
      _id: createObjectId(),
      tenantId: req.tenantId,
      academicYearId: academicYearId || null,
      number: parseInt(number),
      term: term.toUpperCase(),
      isActive: isActive !== undefined ? !!isActive : true
    });

    res.status(201).json({ success: true, message: 'Semester created', data: { semester: doc } });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 4. COURSES / SUBJECTS
// -------------------------------------------------------------
const getCourses = async (req, res, next) => {
  try {
    const col = getCollection('courses');
    const filter = scopeQuery({}, req);
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    if (req.query.semesterId) filter.semesterId = req.query.semesterId;

    const courses = await col.find(filter, { sort: { code: 1 } });
    res.json({ success: true, data: { count: courses.length, courses } });
  } catch (err) {
    next(err);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const { code, name, departmentId, semesterId, credits, theoryHours, practicalHours, syllabusModules } = req.body;
    if (!code || !name || !departmentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Course code, name, and departmentId are required.' }
      });
    }

    // Verify department belongs to this tenant
    const depts = getCollection('departments');
    const validDept = await depts.findOne(scopeQuery({ _id: departmentId }, req));
    if (!validDept) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DEPARTMENT', message: 'Specified department does not exist in your institution.' }
      });
    }

    const col = getCollection('courses');
    const doc = await col.insertOne({
      _id: createObjectId(),
      tenantId: req.tenantId,
      code: code.toUpperCase().trim(),
      name: name.trim(),
      departmentId,
      semesterId: semesterId || null,
      credits: parseInt(credits) || 4,
      theoryHours: parseInt(theoryHours) || 3,
      practicalHours: parseInt(practicalHours) || 2,
      syllabusModules: parseInt(syllabusModules) || 6
    });

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'CREATE_COURSE', 'COURSE', doc._id, { code, name }, req);
    res.status(201).json({ success: true, message: 'Course subject created', data: { course: doc } });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 5. DIVISIONS
// -------------------------------------------------------------
const getDivisions = async (req, res, next) => {
  try {
    const col = getCollection('divisions');
    const filter = scopeQuery({}, req);
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;

    const divisions = await col.find(filter, { sort: { name: 1 } });
    res.json({ success: true, data: { count: divisions.length, divisions } });
  } catch (err) {
    next(err);
  }
};

const createDivision = async (req, res, next) => {
  try {
    const { departmentId, semesterId, name, classTeacher, roomNumber } = req.body;
    if (!departmentId || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'departmentId and division name (e.g. Div A) are required.' }
      });
    }

    const col = getCollection('divisions');
    const doc = await col.insertOne({
      _id: createObjectId(),
      tenantId: req.tenantId,
      departmentId,
      semesterId: semesterId || null,
      name: name.trim(),
      classTeacher: classTeacher || null,
      roomNumber: roomNumber || null
    });

    res.status(201).json({ success: true, message: 'Division created', data: { division: doc } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAcademicYears,
  createAcademicYear,
  getDepartments,
  createDepartment,
  updateDepartment,
  getSemesters,
  createSemester,
  getCourses,
  createCourse,
  getDivisions,
  createDivision
};
