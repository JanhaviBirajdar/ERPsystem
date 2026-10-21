const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCollection, createObjectId } = require('../config/database');
const { JWT_SECRET } = require('../middleware/authenticate');
const { recordAuditLog } = require('../middleware/auditLogger');

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CREDENTIALS', message: 'Username/Email and password are required.' }
      });
    }

    const users = getCollection('users');
    const institutions = getCollection('institutions');

    // Find user across active users
    const user = await users.findOne({
      $or: [{ username: username.toLowerCase().trim() }, { email: username.toLowerCase().trim() }],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' }
      });
    }

    // Verify Password Hash
    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' }
      });
    }

    // Tenant Scoping Verification: If a tenant was resolved from subdomain or header, verify match
    if (req.tenantId && user.role !== 'SUPER_ADMIN' && user.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'This user account does not belong to the institution accessed at this domain.'
        }
      });
    }

    const tenant = user.tenantId ? await institutions.findById(user.tenantId) : null;

    // Issue JWT Token with Claims
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAuditLog(user.tenantId, user._id, user.role, 'USER_LOGIN', 'USER', user._id, 'Successful login', req);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
          avatarUrl: user.avatarUrl || null,
          tenant: tenant ? { id: tenant._id, name: tenant.name, code: tenant.tenantCode, subdomain: tenant.subdomain } : null
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me
const getMe = async (req, res, next) => {
  try {
    const users = getCollection('users');
    const institutions = getCollection('institutions');

    const user = await users.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Current user profile not found.' }
      });
    }

    const tenant = user.tenantId ? await institutions.findById(user.tenantId) : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
          avatarUrl: user.avatarUrl || null,
          tenant: tenant ? {
            id: tenant._id,
            name: tenant.name,
            code: tenant.tenantCode,
            subdomain: tenant.subdomain,
            naacGrade: tenant.naacGrade,
            affiliation: tenant.affiliation
          } : null
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/logout
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await recordAuditLog(req.user.tenantId, req.user._id, req.user.role, 'USER_LOGOUT', 'USER', req.user._id, 'User signed out', req);
    }
    res.json({
      success: true,
      message: 'Successfully logged out. Client token cleared.'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/onboard-college (Institution registration and college admin provisioning)
const onboardCollege = async (req, res, next) => {
  try {
    const {
      name,
      tenantCode,
      subdomain,
      affiliation,
      naacGrade,
      aicteApprovalNo,
      contactEmail,
      contactPhone,
      adminUsername,
      adminPassword,
      adminFullName,
      adminEmail
    } = req.body;

    if (!name || !tenantCode || !subdomain || !adminUsername || !adminPassword || !adminEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ONBOARDING_FIELDS',
          message: 'Institution name, tenantCode, subdomain, and admin credentials are required.'
        }
      });
    }

    const institutions = getCollection('institutions');
    const users = getCollection('users');
    const academicYears = getCollection('academic_years');

    // Validate uniqueness of tenant code and subdomain
    const existingCode = await institutions.findOne({ tenantCode: tenantCode.toUpperCase() });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        error: { code: 'TENANT_CODE_EXISTS', message: `Tenant code '${tenantCode}' is already registered.` }
      });
    }

    const existingSubdomain = await institutions.findOne({ subdomain: subdomain.toLowerCase() });
    if (existingSubdomain) {
      return res.status(409).json({
        success: false,
        error: { code: 'SUBDOMAIN_EXISTS', message: `Subdomain '${subdomain}' is already in use.` }
      });
    }

    // 1. Create Institution Document
    const institutionId = createObjectId();
    const newInstitution = await institutions.insertOne({
      _id: institutionId,
      name,
      tenantCode: tenantCode.toUpperCase().trim(),
      subdomain: subdomain.toLowerCase().trim(),
      affiliation: affiliation || 'State Technological University',
      naacGrade: naacGrade || 'A+',
      aicteApprovalNo: aicteApprovalNo || 'AICTE/REG/2026',
      contact: {
        email: contactEmail || adminEmail,
        phone: contactPhone || '+91 20 2740 1200'
      },
      subscription: { plan: 'ENTERPRISE', status: 'ACTIVE' }
    });

    // 2. Create College Admin Account
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    const adminUserId = createObjectId();
    const newAdmin = await users.insertOne({
      _id: adminUserId,
      tenantId: institutionId,
      username: adminUsername.toLowerCase().trim(),
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: 'COLLEGE_ADMIN',
      fullName: adminFullName || 'College Administrator',
      isActive: true
    });

    // 3. Provision Default Academic Year
    await academicYears.insertOne({
      _id: createObjectId(),
      tenantId: institutionId,
      name: '2026-2027',
      isCurrent: true,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30')
    });

    await recordAuditLog(institutionId, adminUserId, 'COLLEGE_ADMIN', 'COLLEGE_ONBOARDED', 'INSTITUTION', institutionId, {
      name,
      tenantCode,
      subdomain
    }, req);

    res.status(201).json({
      success: true,
      message: 'College onboarded successfully and admin provisioned!',
      data: {
        institution: {
          id: newInstitution._id,
          name: newInstitution.name,
          tenantCode: newInstitution.tenantCode,
          subdomain: newInstitution.subdomain
        },
        admin: {
          id: newAdmin._id,
          username: newAdmin.username,
          role: newAdmin.role,
          email: newAdmin.email
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/demo-personas
const getDemoPersonas = async (req, res, next) => {
  try {
    const users = getCollection('users');
    const institutions = getCollection('institutions');

    // Find users across roles with their college name
    const allUsers = await users.find({ isActive: true });
    const personas = await Promise.all(allUsers.map(async u => {
      const inst = u.tenantId ? await institutions.findById(u.tenantId) : null;
      return {
        id: u._id,
        username: u.username,
        role: u.role,
        fullName: u.fullName,
        collegeName: inst ? inst.name : 'SaaS Platform',
        tenantCode: inst ? inst.tenantCode : 'PLATFORM'
      };
    }));

    res.json({ success: true, data: { personas } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/switch-persona (For quick demonstration and evaluation)
const switchPersona = async (req, res, next) => {
  try {
    const { username } = req.body;
    const users = getCollection('users');
    const institutions = getCollection('institutions');

    const user = await users.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: `Persona with username '${username}' not found.` }
      });
    }

    const tenant = user.tenantId ? await institutions.findById(user.tenantId) : null;

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
          avatarUrl: user.avatarUrl || null,
          tenant: tenant ? { id: tenant._id, name: tenant.name, code: tenant.tenantCode, subdomain: tenant.subdomain } : null
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getMe,
  logout,
  onboardCollege,
  getDemoPersonas,
  switchPersona
};
