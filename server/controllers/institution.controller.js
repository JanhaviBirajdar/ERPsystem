const { getCollection } = require('../config/database');
const { recordAuditLog } = require('../middleware/auditLogger');

// GET /api/v1/institution - Current tenant details
const getInstitution = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const inst = await institutions.findById(req.tenantId);

    if (!inst) {
      return res.status(404).json({
        success: false,
        error: { code: 'INSTITUTION_NOT_FOUND', message: 'Institution profile not found.' }
      });
    }

    res.json({ success: true, data: { institution: inst } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/institution - Update current tenant details
const updateInstitution = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const { name, affiliation, naacGrade, contact, branding, academicSettings, subscription } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (affiliation) updateFields.affiliation = affiliation;
    if (naacGrade) updateFields.naacGrade = naacGrade;
    if (contact) updateFields.contact = contact;
    if (branding) updateFields.branding = branding;
    if (academicSettings) updateFields.academicSettings = academicSettings;
    if (subscription) updateFields.subscription = subscription;

    const updated = await institutions.findByIdAndUpdate(req.tenantId, updateFields);

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'UPDATE_INSTITUTION', 'INSTITUTION', req.tenantId, updateFields, req);

    res.json({
      success: true,
      message: 'Institution profile updated successfully.',
      data: { institution: updated }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/institution/branding
const getBranding = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const inst = await institutions.findById(req.tenantId);

    const defaultBranding = {
      portalTitle: inst?.name || 'College ERP System',
      tagline: 'Autonomous Engineering College • NAAC A++ Accredited',
      logoUrl: inst?.branding?.logoUrl || '/assets/ait-logo.png',
      primaryColor: inst?.branding?.primaryColor || '#2563eb',
      secondaryColor: inst?.branding?.secondaryColor || '#1e293b',
      accentColor: inst?.branding?.accentColor || '#7c3aed'
    };

    res.json({
      success: true,
      data: {
        branding: inst?.branding ? { ...defaultBranding, ...inst.branding } : defaultBranding
      }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/institution/branding
const updateBranding = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const { portalTitle, tagline, logoUrl, primaryColor, secondaryColor, accentColor } = req.body;

    const branding = {
      portalTitle: portalTitle || 'College ERP System',
      tagline: tagline || '',
      logoUrl: logoUrl || '/assets/ait-logo.png',
      primaryColor: primaryColor || '#2563eb',
      secondaryColor: secondaryColor || '#1e293b',
      accentColor: accentColor || '#7c3aed',
      updatedAt: new Date()
    };

    const updated = await institutions.findByIdAndUpdate(req.tenantId, { branding });

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'UPDATE_BRANDING', 'INSTITUTION', req.tenantId, branding, req);

    res.json({
      success: true,
      message: 'Institution branding successfully updated.',
      data: { branding }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/institution/academic-settings
const getAcademicSettings = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const inst = await institutions.findById(req.tenantId);

    const defaultSettings = {
      attendanceStatutoryMinPct: 75.0,
      attendanceCriticalPct: 65.0,
      passingMarksPct: 40.0,
      gradingScale: '10_POINT_CGPA',
      termsPerYear: 2,
      workingDaysPerWeek: 5,
      cieMaxMarks: 50,
      semesterDurationWeeks: 16
    };

    res.json({
      success: true,
      data: {
        settings: inst?.academicSettings ? { ...defaultSettings, ...inst.academicSettings } : defaultSettings
      }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/institution/academic-settings
const updateAcademicSettings = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const {
      attendanceStatutoryMinPct,
      attendanceCriticalPct,
      passingMarksPct,
      gradingScale,
      termsPerYear,
      workingDaysPerWeek
    } = req.body;

    const academicSettings = {
      attendanceStatutoryMinPct: Number(attendanceStatutoryMinPct) || 75.0,
      attendanceCriticalPct: Number(attendanceCriticalPct) || 65.0,
      passingMarksPct: Number(passingMarksPct) || 40.0,
      gradingScale: gradingScale || '10_POINT_CGPA',
      termsPerYear: Number(termsPerYear) || 2,
      workingDaysPerWeek: Number(workingDaysPerWeek) || 5,
      updatedAt: new Date()
    };

    const updated = await institutions.findByIdAndUpdate(req.tenantId, { academicSettings });

    await recordAuditLog(req.tenantId, req.user._id, req.user.role, 'UPDATE_ACADEMIC_SETTINGS', 'INSTITUTION', req.tenantId, academicSettings, req);

    res.json({
      success: true,
      message: 'Configurable academic settings updated successfully.',
      data: { settings: academicSettings }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/institution/all - SaaS Super Admin only
const getAllInstitutions = async (req, res, next) => {
  try {
    const institutions = getCollection('institutions');
    const all = await institutions.find({});
    res.json({ success: true, data: { count: all.length, institutions: all } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/institution/public-branding/:subdomain - Unauthenticated public branding for login
const getPublicBranding = async (req, res, next) => {
  try {
    const { subdomain } = req.params;
    const institutions = getCollection('institutions');
    const inst = await institutions.findOne({ subdomain: subdomain.toLowerCase() });

    if (!inst) {
      return res.status(404).json({ success: false, error: { message: 'Institution not found for subdomain' } });
    }

    res.json({
      success: true,
      data: {
        name: inst.name,
        code: inst.tenantCode,
        subdomain: inst.subdomain,
        branding: inst.branding || {
          portalTitle: inst.name,
          logoUrl: '/assets/ait-logo.png',
          primaryColor: '#2563eb'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInstitution,
  updateInstitution,
  getBranding,
  updateBranding,
  getAcademicSettings,
  updateAcademicSettings,
  getAllInstitutions,
  getPublicBranding
};
