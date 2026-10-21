import React, { useState, useEffect } from 'react';
import { 
  UserCheck, UserPlus, Search, Filter, CheckCircle2, 
  XCircle, AlertCircle, FileText, Check, Award, Eye, 
  BarChart3, RefreshCw, ChevronRight, Layers, Building
} from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { FormField, AlertBanner } from '../components/common/FormElements';

export default function AdmissionsPage({ user }) {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modals State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifiedDocs, setVerifiedDocs] = useState([]);
  const [verifyNotes, setVerifyNotes] = useState('');

  // Application Form State
  const [newApp, setNewApp] = useState({
    candidate_name: '',
    email: '',
    phone: '',
    category: 'OPEN',
    entrance_exam: 'MHT-CET',
    entrance_score: '',
    entrance_rank: '',
    department_id: 'dept-comp',
    tenth_pct: '',
    twelfth_pct: ''
  });

  // Reports State
  const [reports, setReports] = useState(null);

  useEffect(() => {
    loadApplications();
    loadReports();
  }, [statusFilter, categoryFilter, departmentFilter]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (departmentFilter) params.department_id = departmentFilter;
      if (search) params.search = search;

      const res = await api.admissions.getApplications(params);
      setApplications(res.applications || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const res = await api.admissions.getReports();
      setReports(res);
    } catch (err) {
      console.error('Failed to load admission reports:', err);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.admissions.createApplication(newApp);
      showFeedback('success', `Application ${res.application.application_no} submitted successfully!`);
      setShowApplyModal(false);
      setNewApp({
        candidate_name: '',
        email: '',
        phone: '',
        category: 'OPEN',
        entrance_exam: 'MHT-CET',
        entrance_score: '',
        entrance_rank: '',
        department_id: 'dept-comp',
        tenth_pct: '',
        twelfth_pct: ''
      });
      loadApplications();
      loadReports();
    } catch (err) {
      showFeedback('error', `Submission error: ${err.message}`);
    }
  };

  const handleOpenVerifyModal = (app) => {
    setSelectedApp(app);
    const existing = app.documents || [];
    setVerifiedDocs(existing.filter(d => d.verified).map(d => d.name));
    setVerifyNotes(app.verification_notes || '');
    setShowVerifyModal(true);
  };

  const handleSaveVerification = async () => {
    try {
      await api.admissions.verifyDocuments(selectedApp.id, {
        verified_documents: verifiedDocs,
        notes: verifyNotes
      });
      showFeedback('success', 'Document verification updated successfully!');
      setShowVerifyModal(false);
      loadApplications();
    } catch (err) {
      showFeedback('error', `Verification failed: ${err.message}`);
    }
  };

  const handleCheckEligibility = async (appId) => {
    try {
      const res = await api.admissions.checkEligibility(appId);
      showFeedback(res.eligible ? 'success' : 'error', res.remarks);
      loadApplications();
    } catch (err) {
      showFeedback('error', `Eligibility check failed: ${err.message}`);
    }
  };

  const handleApprove = async (appId) => {
    try {
      await api.admissions.approve(appId);
      showFeedback('success', 'Application officially APPROVED for enrollment!');
      loadApplications();
      loadReports();
    } catch (err) {
      showFeedback('error', `Approval failed: ${err.message}`);
    }
  };

  const handleEnroll = async (appId) => {
    if (!confirm('Proceed with official student enrollment? This will create a permanent SIS record with PRN, user credentials, and an initial fee invoice.')) return;
    try {
      const res = await api.admissions.enroll(appId);
      showFeedback('success', `Candidate enrolled! PRN: ${res.student.prn}, Roll No: ${res.student.roll_no}, Username: ${res.student.username}`);
      loadApplications();
      loadReports();
    } catch (err) {
      showFeedback('error', `Enrollment failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ENROLLED':
        return <span className="badge badge-success" style={{ fontWeight: 700 }}><CheckCircle2 size={12} /> ENROLLED</span>;
      case 'APPROVED':
        return <span className="badge badge-primary" style={{ fontWeight: 700 }}>APPROVED</span>;
      case 'ELIGIBLE':
        return <span className="badge badge-info" style={{ fontWeight: 600 }}>ELIGIBLE</span>;
      case 'DOCS_VERIFIED':
        return <span className="badge badge-secondary" style={{ fontWeight: 600 }}>DOCS VERIFIED</span>;
      case 'REJECTED':
        return <span className="badge badge-danger" style={{ fontWeight: 700 }}>REJECTED</span>;
      default:
        return <span className="badge badge-warning" style={{ fontWeight: 600 }}>APPLIED</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Admission & Enrollment Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Candidate applications, document verification, quota eligibility, approvals, and central SIS enrollment
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { loadApplications(); loadReports(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowApplyModal(true)}>
            <UserPlus size={15} /> New Application
          </button>
        </div>
      </div>

      {feedback && <AlertBanner type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        <button className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
          <UserCheck size={15} /> Candidate Applications ({applications.length})
        </button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          <BarChart3 size={15} /> Intake & Quota Analytics
        </button>
      </div>

      {/* =========================================================================
          TAB 1: APPLICATIONS LIST & WORKFLOW ACTIONS
          ========================================================================= */}
      {activeTab === 'applications' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', flex: 1 }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by candidate name, app no, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadApplications()}
                style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="">All Departments</option>
              <option value="dept-comp">Computer Engineering</option>
              <option value="dept-it">Information Technology</option>
              <option value="dept-entc">Electronics & Telecom</option>
              <option value="dept-mech">Mechanical Engineering</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="">All Categories</option>
              <option value="OPEN">OPEN</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="TFWS">TFWS</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="">All Statuses</option>
              <option value="APPLIED">APPLIED</option>
              <option value="DOCS_VERIFIED">DOCS_VERIFIED</option>
              <option value="ELIGIBLE">ELIGIBLE</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ENROLLED">ENROLLED</option>
            </select>
          </div>

          <DataTable
            columns={[
              {
                key: 'application_no',
                header: 'App No',
                render: (val) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>{val}</span>
              },
              {
                key: 'candidate_name',
                header: 'Candidate Name',
                render: (val, row) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email} • {row.phone}</div>
                  </div>
                )
              },
              {
                key: 'department_name',
                header: 'Department',
                render: (val, row) => <span className="badge badge-info">{row.department_code || val}</span>
              },
              {
                key: 'category',
                header: 'Category / Quota',
                render: (val) => <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{val}</span>
              },
              {
                key: 'entrance_score',
                header: 'Score / Rank',
                render: (val, row) => (
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>{val}</strong> ({row.entrance_exam})
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rank #{row.entrance_rank || '—'}</div>
                  </div>
                )
              },
              {
                key: 'twelfth_pct',
                header: '12th %',
                align: 'center',
                render: (val) => `${val}%`
              },
              {
                key: 'status',
                header: 'Workflow Stage',
                render: (val) => getStatusBadge(val)
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, row) => (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    {row.status === 'APPLIED' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleOpenVerifyModal(row)}
                        title="Verify Candidate Documents"
                      >
                        <FileText size={13} /> Verify Docs
                      </button>
                    )}

                    {row.status === 'DOCS_VERIFIED' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--primary)' }}
                        onClick={() => handleCheckEligibility(row.id)}
                        title="Check Minimum Eligibility Criteria"
                      >
                        <Award size={13} /> Check Eligibility
                      </button>
                    )}

                    {row.status === 'ELIGIBLE' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#10b981' }}
                        onClick={() => handleApprove(row.id)}
                        title="Approve for Central Enrollment"
                      >
                        <Check size={13} /> Approve
                      </button>
                    )}

                    {row.status === 'APPROVED' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}
                        onClick={() => handleEnroll(row.id)}
                        title="Complete Enrollment into Central Student Records"
                      >
                        <UserCheck size={13} /> Enroll into SIS
                      </button>
                    )}

                    {row.status === 'ENROLLED' && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        SIS ID: {row.enrolled_student_id}
                      </span>
                    )}
                  </div>
                )
              }
            ]}
            data={applications}
            loading={loading}
            pageSize={8}
            emptyMessage="No admission applications matching the selected criteria."
          />
        </div>
      )}

      {/* =========================================================================
          TAB 2: INTAKE & QUOTA ANALYTICS
          ========================================================================= */}
      {activeTab === 'reports' && reports && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL APPLICATIONS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--primary)' }}>
                {applications.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Academic Year 2026-2027 Admissions
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>APPROVED APPLICANTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                {applications.filter(a => ['APPROVED', 'ENROLLED'].includes(a.status)).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Cleared document & merit eligibility
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CENTRAL SIS ENROLLED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#7c3aed' }}>
                {applications.filter(a => a.status === 'ENROLLED').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Official PRN & invoices assigned
              </div>
            </div>
          </div>

          {/* Department Intake vs Admitted Table */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="var(--primary)" /> Department-Wise Intake Capacity vs Enrolled Seats
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Department</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Intake Capacity</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Applications</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Enrolled</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Vacant Seats</th>
                    <th style={{ padding: '10px 14px' }}>Admission Fill Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.intakeVsAdmitted?.map(row => {
                    const fillRate = row.intake_capacity > 0 ? Math.round((row.enrolled_count / row.intake_capacity) * 100) : 0;
                    return (
                      <tr key={row.department_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          {row.department_name} ({row.department_code})
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{row.intake_capacity}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>{row.applied_count}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{row.enrolled_count}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: row.vacant_seats > 0 ? '#3b82f6' : '#94a3b8' }}>
                          {row.vacant_seats}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(fillRate, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #10b981)' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{fillRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SUBMIT NEW APPLICATION
          ========================================================================= */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Submit Admission Application"
        subtitle="Registers prospective student for CAP / Institutional seat merit rounds"
        icon={UserPlus}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleApplySubmit}><Check size={16} /> Submit Application</button>
          </>
        }
      >
        <form onSubmit={handleApplySubmit}>
          <div className="form-row">
            <FormField label="Candidate Full Name" required>
              <input
                type="text"
                required
                placeholder="e.g., Aditya Deshmukh"
                className="form-input"
                value={newApp.candidate_name}
                onChange={(e) => setNewApp({ ...newApp, candidate_name: e.target.value })}
              />
            </FormField>

            <FormField label="Email Address" required>
              <input
                type="email"
                required
                placeholder="aditya@gmail.com"
                className="form-input"
                value={newApp.email}
                onChange={(e) => setNewApp({ ...newApp, email: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Mobile Number" required>
              <input
                type="tel"
                required
                placeholder="+91 98221 00000"
                className="form-input"
                value={newApp.phone}
                onChange={(e) => setNewApp({ ...newApp, phone: e.target.value })}
              />
            </FormField>

            <FormField label="Admission Category" required>
              <select
                className="form-input"
                value={newApp.category}
                onChange={(e) => setNewApp({ ...newApp, category: e.target.value })}
              >
                <option value="OPEN">OPEN (General Merit)</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="TFWS">TFWS (Tuition Fee Waiver)</option>
              </select>
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Preferred Department" required>
              <select
                className="form-input"
                value={newApp.department_id}
                onChange={(e) => setNewApp({ ...newApp, department_id: e.target.value })}
              >
                <option value="dept-comp">Computer Engineering (COMP)</option>
                <option value="dept-it">Information Technology (IT)</option>
                <option value="dept-entc">Electronics & Telecom (ENTC)</option>
                <option value="dept-mech">Mechanical Engineering (MECH)</option>
              </select>
            </FormField>

            <FormField label="Entrance Exam" required>
              <select
                className="form-input"
                value={newApp.entrance_exam}
                onChange={(e) => setNewApp({ ...newApp, entrance_exam: e.target.value })}
              >
                <option value="MHT-CET">MHT-CET</option>
                <option value="JEE_MAIN">JEE Main</option>
                <option value="GATE">GATE (Postgraduate)</option>
              </select>
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Entrance Exam Percentile / Score" required>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g., 94.50"
                className="form-input"
                value={newApp.entrance_score}
                onChange={(e) => setNewApp({ ...newApp, entrance_score: e.target.value })}
              />
            </FormField>

            <FormField label="Merit Rank">
              <input
                type="number"
                placeholder="e.g., 3420"
                className="form-input"
                value={newApp.entrance_rank}
                onChange={(e) => setNewApp({ ...newApp, entrance_rank: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="10th (SSC) Aggregate %" required>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g., 91.2"
                className="form-input"
                value={newApp.tenth_pct}
                onChange={(e) => setNewApp({ ...newApp, tenth_pct: e.target.value })}
              />
            </FormField>

            <FormField label="12th (HSC) PCM %" required>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g., 86.4"
                className="form-input"
                value={newApp.twelfth_pct}
                onChange={(e) => setNewApp({ ...newApp, twelfth_pct: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: DOCUMENT VERIFICATION CHECKLIST
          ========================================================================= */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Candidate Document Verification"
        subtitle={`Application: ${selectedApp?.application_no} • Candidate: ${selectedApp?.candidate_name}`}
        icon={FileText}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowVerifyModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveVerification}><Check size={16} /> Save Document Status</button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Verify physically submitted original copies and mark verified status:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {selectedApp?.documents?.map(doc => {
              const isChecked = verifiedDocs.includes(doc.name);
              return (
                <label
                  key={doc.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--table-header-bg)',
                    border: `1px solid ${isChecked ? '#10b981' : 'var(--border-color)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVerifiedDocs([...verifiedDocs, doc.name]);
                      } else {
                        setVerifiedDocs(verifiedDocs.filter(n => n !== doc.name));
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{doc.name}</span>
                </label>
              );
            })}
          </div>

          <FormField label="Admission Officer Verification Remarks">
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g., Original caste validity and income certificate checked."
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
