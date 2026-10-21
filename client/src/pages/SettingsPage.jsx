import React, { useState, useEffect } from 'react';
import { 
  Building2, Shield, Calendar, Layers, BookOpen, Clock, 
  Plus, Check, AlertCircle, Save, ExternalLink, RefreshCw, Key
} from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { FormField, AlertBanner } from '../components/common/FormElements';

export default function SettingsPage({ user }) {
  const [activeTab, setActiveTab] = useState('institution');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, message }

  // Institution State
  const [institution, setInstitution] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    naac_grade: 'A++'
  });

  // College Onboarding Modal State
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    code: '',
    subdomain: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    address: '',
    phone: ''
  });
  const [institutionsList, setInstitutionsList] = useState([]);

  // Academic Config State
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // Academic Config Creation Modals
  const [modalType, setModalType] = useState(null); // 'year' | 'department' | 'course' | 'semester' | 'division'
  const [itemForm, setItemForm] = useState({});

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadInstitution();
    loadAcademicConfig();
    loadAuditLogs();
    if (user?.role === 'SUPER_ADMIN') {
      loadAllInstitutions();
    }
  }, [user]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  const loadInstitution = async () => {
    try {
      const res = await api.v1.institution.get();
      if (res.institution) {
        setInstitution(res.institution);
        setFormData({
          name: res.institution.name || '',
          tagline: res.institution.tagline || '',
          address: res.institution.address || '',
          phone: res.institution.phone || '',
          email: res.institution.email || '',
          website: res.institution.website || '',
          naac_grade: res.institution.naac_grade || 'A++'
        });
      }
    } catch (err) {
      console.warn('Fallback to legacy institution endpoint:', err.message);
      const res = await api.institution.get().catch(() => ({}));
      if (res.institution) {
        setInstitution(res.institution);
        setFormData(res.institution);
      }
    }
  };

  const loadAllInstitutions = async () => {
    try {
      const res = await api.v1.institution.listAll();
      setInstitutionsList(res.institutions || []);
    } catch (err) {
      console.error('Failed to load institutions list:', err);
    }
  };

  const loadAcademicConfig = async () => {
    setLoading(true);
    try {
      const [yearsRes, deptsRes, coursesRes, semsRes, divsRes] = await Promise.all([
        api.v1.academicConfig.getAcademicYears().catch(() => ({ data: [] })),
        api.v1.academicConfig.getDepartments().catch(() => ({ data: [] })),
        api.v1.academicConfig.getCourses().catch(() => ({ data: [] })),
        api.v1.academicConfig.getSemesters().catch(() => ({ data: [] })),
        api.v1.academicConfig.getDivisions().catch(() => ({ data: [] }))
      ]);

      setAcademicYears(yearsRes.data || []);
      setDepartments(deptsRes.data || []);
      setCourses(coursesRes.data || []);
      setSemesters(semsRes.data || []);
      setDivisions(divsRes.data || []);
    } catch (err) {
      console.error('Failed to load academic config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.v1.audit.getLogs({ limit: 50 });
      setAuditLogs(res.logs || []);
    } catch (err) {
      console.warn('Fallback to legacy audit logs:', err.message);
      const legacy = await api.analytics.getAuditLogs(50).catch(() => ({ logs: [] }));
      setAuditLogs(legacy.logs || []);
    }
  };

  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    try {
      await api.v1.institution.update(formData);
      showFeedback('success', 'Institution profile & branding successfully saved!');
      loadInstitution();
    } catch (err) {
      showFeedback('error', `Update failed: ${err.message}`);
    }
  };

  const handleOnboardCollege = async (e) => {
    e.preventDefault();
    try {
      const res = await api.v1.auth.onboardCollege(onboardForm);
      showFeedback('success', `College "${res.institution.name}" onboarded successfully! Tenant Code: ${res.institution.code}`);
      setIsOnboardingModalOpen(false);
      setOnboardForm({
        name: '',
        code: '',
        subdomain: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        address: '',
        phone: ''
      });
      loadAllInstitutions();
    } catch (err) {
      showFeedback('error', `Onboarding error: ${err.message}`);
    }
  };

  const handleCreateAcademicItem = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'year') {
        await api.v1.academicConfig.createAcademicYear(itemForm);
        showFeedback('success', 'Academic Year created successfully!');
      } else if (modalType === 'department') {
        await api.v1.academicConfig.createDepartment(itemForm);
        showFeedback('success', 'Department created successfully!');
      } else if (modalType === 'course') {
        await api.v1.academicConfig.createCourse(itemForm);
        showFeedback('success', 'Course program created successfully!');
      } else if (modalType === 'semester') {
        await api.v1.academicConfig.createSemester(itemForm);
        showFeedback('success', 'Semester configuration created successfully!');
      } else if (modalType === 'division') {
        await api.v1.academicConfig.createDivision(itemForm);
        showFeedback('success', 'Division / Section created successfully!');
      }
      setModalType(null);
      setItemForm({});
      loadAcademicConfig();
    } catch (err) {
      showFeedback('error', `Creation failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Institution Setup & Multi-Tenant Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            College profile, onboarding registry, academic structure (years, depts, courses, semesters, divisions) & immutable audit logs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadAcademicConfig(); loadAuditLogs(); }}
            title="Refresh All Configurations"
          >
            <RefreshCw size={14} /> Refresh
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsOnboardingModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none' }}
          >
            <Building2 size={15} /> Onboard New College
          </button>
        </div>
      </div>

      {/* Global Alert Banner */}
      {feedback && (
        <AlertBanner
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Main Tabs Navigation */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        <button
          className={`tab-btn ${activeTab === 'institution' ? 'active' : ''}`}
          onClick={() => setActiveTab('institution')}
        >
          <Building2 size={15} /> Institution Profile
        </button>

        <button
          className={`tab-btn ${activeTab === 'academic-config' ? 'active' : ''}`}
          onClick={() => setActiveTab('academic-config')}
        >
          <Layers size={15} /> Academic Structure
        </button>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            className={`tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
            onClick={() => setActiveTab('tenants')}
          >
            <Building2 size={15} /> Tenant Registry ({institutionsList.length})
          </button>
        )}

        <button
          className={`tab-btn ${activeTab === 'audits' ? 'active' : ''}`}
          onClick={() => setActiveTab('audits')}
        >
          <Shield size={15} /> Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: INSTITUTION PROFILE & BRANDING
          ========================================================================= */}
      {activeTab === 'institution' && (
        <div className="card" style={{ maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Authorized College Profile</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Active Tenant Context: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{institution?.code || user?.tenantId || 'AITPUNE'}</span>
              </p>
            </div>
            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              Isolated Tenant Scope
            </span>
          </div>

          <form onSubmit={handleSaveInstitution}>
            <FormField label="Institution Legal Name" required>
              <input
                type="text"
                required
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>

            <FormField label="Official Tagline / Approved Affiliation">
              <input
                type="text"
                className="form-input"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </FormField>

            <FormField label="Campus Address">
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </FormField>

            <div className="form-row">
              <FormField label="Official Phone">
                <input
                  type="text"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </FormField>

              <FormField label="Official Email">
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </FormField>
            </div>

            <div className="form-row">
              <FormField label="Official Portal URL">
                <input
                  type="url"
                  className="form-input"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </FormField>

              <FormField label="NAAC Grade">
                <input
                  type="text"
                  className="form-input"
                  value={formData.naac_grade}
                  onChange={(e) => setFormData({ ...formData, naac_grade: e.target.value })}
                />
              </FormField>
            </div>

            {['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role) && (
              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Save Institution Settings
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ACADEMIC STRUCTURE CONFIGURATION
          ========================================================================= */}
      {activeTab === 'academic-config' && (
        <div>
          {/* Subtabs for Year, Dept, Course, Semester, Division */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACADEMIC YEARS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{academicYears.length}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModalType('year'); setItemForm({ is_active: true }); }}>
                <Plus size={14} /> Add Year
              </button>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DEPARTMENTS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{departments.length}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModalType('department'); setItemForm({}); }}>
                <Plus size={14} /> Add Dept
              </button>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PROGRAMS / COURSES</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{courses.length}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModalType('course'); setItemForm({ total_credits: 160, total_semesters: 8 }); }}>
                <Plus size={14} /> Add Course
              </button>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DIVISIONS / SECTIONS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{divisions.length}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModalType('division'); setItemForm({ intake_capacity: 60 }); }}>
                <Plus size={14} /> Add Division
              </button>
            </div>
          </div>

          {/* Section 1: Departments Table */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--primary)" /> Configured Academic Departments
            </h4>
            <DataTable
              columns={[
                { key: 'code', header: 'Dept Code', render: (val) => <span className="badge badge-info" style={{ fontWeight: 700 }}>{val}</span> },
                { key: 'name', header: 'Department Name', render: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                { key: 'hod_name', header: 'Head of Dept (HOD)', render: (val) => val || 'Pending Assignment' },
                { key: 'intake_capacity', header: 'Annual Intake', align: 'center', render: (val) => val || 60 },
                { key: 'tenantId', header: 'Tenant Isolation', render: (val) => <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{val || institution?.code}</span> }
              ]}
              data={departments}
              loading={loading}
              pageSize={5}
              emptyMessage="No departments configured yet for this college."
            />
          </div>

          {/* Section 2: Courses / Degree Programs Table */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--primary)" /> Degree Programs & Courses
            </h4>
            <DataTable
              columns={[
                { key: 'code', header: 'Course Code', render: (val) => <strong style={{ color: 'var(--primary)' }}>{val}</strong> },
                { key: 'name', header: 'Program Name', render: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                { key: 'degree_level', header: 'Level', render: (val) => <span className="badge badge-secondary">{val || 'Undergraduate'}</span> },
                { key: 'total_credits', header: 'Credits', align: 'center', render: (val) => val || 160 },
                { key: 'total_semesters', header: 'Semesters', align: 'center', render: (val) => `${val || 8} Sems` }
              ]}
              data={courses}
              loading={loading}
              pageSize={5}
              emptyMessage="No courses configured yet for this college."
            />
          </div>

          {/* Section 3: Divisions & Sections Table */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="var(--primary)" /> Divisions & Batch Configurations
            </h4>
            <DataTable
              columns={[
                { key: 'name', header: 'Division / Batch', render: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
                { key: 'academic_year', header: 'Academic Year', render: (val) => val || '2025-2026' },
                { key: 'intake_capacity', header: 'Batch Capacity', align: 'center', render: (val) => `${val || 60} Students` },
                { key: 'classroom', header: 'Room / Lab', render: (val) => val || 'Main Hall A' }
              ]}
              data={divisions}
              loading={loading}
              pageSize={5}
              emptyMessage="No student divisions configured yet."
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SAAS SUPER ADMIN TENANT REGISTRY
          ========================================================================= */}
      {activeTab === 'tenants' && user?.role === 'SUPER_ADMIN' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>All Registered Colleges on Modern ERP Platform</h4>
            <button className="btn btn-primary btn-sm" onClick={() => setIsOnboardingModalOpen(true)}>
              <Building2 size={14} /> Onboard New College
            </button>
          </div>
          <DataTable
            columns={[
              { key: 'code', header: 'Tenant Code', render: (val) => <strong style={{ color: 'var(--primary)' }}>{val}</strong> },
              { key: 'name', header: 'College Legal Name', render: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
              { key: 'subdomain', header: 'SaaS Subdomain', render: (val) => <code>{val}.erp.edu</code> },
              { key: 'status', header: 'Status', render: (val) => <span className="badge badge-success">{val || 'ACTIVE'}</span> },
              { key: 'created_at', header: 'Onboarded Date', render: (val) => val ? new Date(val).toLocaleDateString() : 'Active' }
            ]}
            data={institutionsList}
            pageSize={8}
            emptyMessage="No institutions registered."
          />
        </div>
      )}

      {/* =========================================================================
          TAB 4: SECURITY AUDIT TRAIL
          ========================================================================= */}
      {activeTab === 'audits' && (
        <div>
          <DataTable
            columns={[
              { 
                key: 'created_at', 
                header: 'Timestamp', 
                render: (val) => <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{val ? new Date(val).toLocaleString() : 'Just now'}</span> 
              },
              { 
                key: 'user_role', 
                header: 'User Role', 
                render: (val) => <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{val || 'SYSTEM'}</span> 
              },
              { 
                key: 'action', 
                header: 'Action Triggered', 
                render: (val) => <code style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{val}</code> 
              },
              { 
                key: 'entity_type', 
                header: 'Target Entity', 
                render: (val) => <span style={{ fontSize: '0.8rem' }}>{val}</span> 
              },
              { 
                key: 'ip_address', 
                header: 'Client IP', 
                render: (val) => <code style={{ fontSize: '0.72rem' }}>{val || '127.0.0.1'}</code> 
              },
              { 
                key: 'details', 
                header: 'Audit Payload Details', 
                render: (val) => (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val || '')}
                  </span>
                ) 
              }
            ]}
            data={auditLogs}
            pageSize={10}
            emptyMessage="No security audit events recorded yet."
          />
        </div>
      )}

      {/* =========================================================================
          MODAL: ONBOARD NEW COLLEGE / INSTITUTION
          ========================================================================= */}
      <Modal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        title="Onboard New Institution / College"
        subtitle="Registers a new isolated tenant college with dedicated administrator account"
        icon={Building2}
        maxWidth="620px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsOnboardingModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleOnboardCollege}>
              <Check size={16} /> Complete College Onboarding
            </button>
          </>
        }
      >
        <form onSubmit={handleOnboardCollege}>
          <div className="form-row">
            <FormField label="College Legal Name" required>
              <input
                type="text"
                required
                placeholder="e.g., Pune Institute of Technology"
                className="form-input"
                value={onboardForm.name}
                onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
              />
            </FormField>

            <FormField label="Unique College Code" required hint="Used for tenant ID (e.g., PITPUNE)">
              <input
                type="text"
                required
                placeholder="e.g., PITPUNE"
                className="form-input"
                value={onboardForm.code}
                onChange={(e) => setOnboardForm({ ...onboardForm, code: e.target.value.toUpperCase() })}
              />
            </FormField>
          </div>

          <FormField label="Tenant Subdomain Prefix" required hint="e.g. 'pit' resolves to pit.college-erp.edu">
            <input
              type="text"
              required
              placeholder="e.g., pit"
              className="form-input"
              value={onboardForm.subdomain}
              onChange={(e) => setOnboardForm({ ...onboardForm, subdomain: e.target.value.toLowerCase() })}
            />
          </FormField>

          <div style={{ marginTop: '16px', marginBottom: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={15} color="var(--primary)" /> Initial College Administrator Credentials
            </h5>

            <div className="form-row">
              <FormField label="Admin Full Name" required>
                <input
                  type="text"
                  required
                  placeholder="e.g., Dr. Rajesh Sharma"
                  className="form-input"
                  value={onboardForm.admin_name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, admin_name: e.target.value })}
                />
              </FormField>

              <FormField label="Admin Email" required>
                <input
                  type="email"
                  required
                  placeholder="admin@pit.edu"
                  className="form-input"
                  value={onboardForm.admin_email}
                  onChange={(e) => setOnboardForm({ ...onboardForm, admin_email: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Initial Password" required hint="Hashed via bcrypt. Zero plaintext storage.">
              <input
                type="password"
                required
                placeholder="Enter secure initial password"
                className="form-input"
                value={onboardForm.admin_password}
                onChange={(e) => setOnboardForm({ ...onboardForm, admin_password: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: DYNAMIC ACADEMIC CONFIG ITEM CREATION
          ========================================================================= */}
      <Modal
        isOpen={Boolean(modalType)}
        onClose={() => { setModalType(null); setItemForm({}); }}
        title={`Add New ${modalType ? modalType.charAt(0).toUpperCase() + modalType.slice(1) : ''}`}
        subtitle="Configures academic architecture for your authorized tenant"
        icon={Layers}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setModalType(null); setItemForm({}); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateAcademicItem}>
              <Check size={16} /> Save Configuration
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAcademicItem}>
          {modalType === 'year' && (
            <>
              <FormField label="Academic Year Name" required hint="e.g., 2026-2027">
                <input
                  type="text"
                  required
                  placeholder="2026-2027"
                  className="form-input"
                  value={itemForm.year_name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, year_name: e.target.value })}
                />
              </FormField>
              <div className="form-row">
                <FormField label="Start Date">
                  <input
                    type="date"
                    className="form-input"
                    value={itemForm.start_date || ''}
                    onChange={(e) => setItemForm({ ...itemForm, start_date: e.target.value })}
                  />
                </FormField>
                <FormField label="End Date">
                  <input
                    type="date"
                    className="form-input"
                    value={itemForm.end_date || ''}
                    onChange={(e) => setItemForm({ ...itemForm, end_date: e.target.value })}
                  />
                </FormField>
              </div>
            </>
          )}

          {modalType === 'department' && (
            <>
              <div className="form-row">
                <FormField label="Department Code" required hint="e.g. EXTC, COMP, MECH">
                  <input
                    type="text"
                    required
                    placeholder="EXTC"
                    className="form-input"
                    value={itemForm.code || ''}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
                  />
                </FormField>
                <FormField label="Annual Intake Capacity">
                  <input
                    type="number"
                    className="form-input"
                    value={itemForm.intake_capacity || 60}
                    onChange={(e) => setItemForm({ ...itemForm, intake_capacity: Number(e.target.value) })}
                  />
                </FormField>
              </div>
              <FormField label="Department Name" required>
                <input
                  type="text"
                  required
                  placeholder="Electronics & Telecommunication"
                  className="form-input"
                  value={itemForm.name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </FormField>
              <FormField label="Head of Department (HOD) Name">
                <input
                  type="text"
                  placeholder="Dr. R. K. Joshi"
                  className="form-input"
                  value={itemForm.hod_name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, hod_name: e.target.value })}
                />
              </FormField>
            </>
          )}

          {modalType === 'course' && (
            <>
              <div className="form-row">
                <FormField label="Course Program Code" required hint="e.g., BT-EXTC">
                  <input
                    type="text"
                    required
                    placeholder="BT-EXTC"
                    className="form-input"
                    value={itemForm.code || ''}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
                  />
                </FormField>
                <FormField label="Total Credits">
                  <input
                    type="number"
                    className="form-input"
                    value={itemForm.total_credits || 160}
                    onChange={(e) => setItemForm({ ...itemForm, total_credits: Number(e.target.value) })}
                  />
                </FormField>
              </div>
              <FormField label="Course Program Name" required>
                <input
                  type="text"
                  required
                  placeholder="B.Tech in Electronics & Telecommunication"
                  className="form-input"
                  value={itemForm.name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </FormField>
            </>
          )}

          {modalType === 'division' && (
            <>
              <FormField label="Division / Section Name" required hint="e.g., TE Div A">
                <input
                  type="text"
                  required
                  placeholder="Third Year Div A"
                  className="form-input"
                  value={itemForm.name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </FormField>
              <div className="form-row">
                <FormField label="Academic Year">
                  <input
                    type="text"
                    placeholder="2025-2026"
                    className="form-input"
                    value={itemForm.academic_year || '2025-2026'}
                    onChange={(e) => setItemForm({ ...itemForm, academic_year: e.target.value })}
                  />
                </FormField>
                <FormField label="Intake Capacity">
                  <input
                    type="number"
                    className="form-input"
                    value={itemForm.intake_capacity || 60}
                    onChange={(e) => setItemForm({ ...itemForm, intake_capacity: Number(e.target.value) })}
                  />
                </FormField>
              </div>
              <FormField label="Designated Classroom / Lab">
                <input
                  type="text"
                  placeholder="Lecture Hall 204"
                  className="form-input"
                  value={itemForm.classroom || ''}
                  onChange={(e) => setItemForm({ ...itemForm, classroom: e.target.value })}
                />
              </FormField>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
