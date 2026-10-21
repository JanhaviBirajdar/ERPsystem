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
    const { name, affiliation, naacGrade, contact, branding } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (affiliation) updateFields.affiliation = affiliation;
    if (naacGrade) updateFields.naacGrade = naacGrade;
    if (contact) updateFields.contact = contact;
    if (branding) updateFields.branding = branding;

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

module.exports = {
  getInstitution,
  updateInstitution,
  getAllInstitutions
};
