import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, UserPlus, Search, BookOpen, Clock, 
  Mail, Phone, X, Check, Calendar, AlertTriangle, Layers, Plus, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { FormField, AlertBanner } from '../components/common/FormElements';

export default function FacultyPage({ user }) {
  const [activeTab, setActiveTab] = useState('directory');
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Form States
  const [newFaculty, setNewFaculty] = useState({
    full_name: '',
    designation: 'Assistant Professor',
    department_id: 'dept-comp',
    qualification: 'M.Tech, Ph.D Pursuing',
    specialization: 'Artificial Intelligence & Machine Learning',
    experience_years: 5,
    email: '',
    phone: '',
    weekly_workload_hours: 16
  });

  const [allocForm, setAllocForm] = useState({
    faculty_id: '',
    subject_id: 'sub-cs501',
    division_id: 'div-comp-5a'
  });

  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'CASUAL',
    start_date: '',
    end_date: '',
    days_count: 1,
    reason: ''
  });

  // Leaves & Workload Data
  const [leaves, setLeaves] = useState([]);
  const [workload, setWorkload] = useState([]);

  useEffect(() => {
    loadFaculty();
    loadLeaves();
    loadWorkload();
  }, [selectedDept]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department_id = selectedDept;
      if (search) params.search = search;
      const res = await api.faculty.getAll(params);
      setFaculty(res.faculty || []);
    } catch (err) {
      console.error('Failed to load faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaves = async () => {
    try {
      const res = await api.faculty.getLeaves();
      setLeaves(res.leaves || []);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    }
  };

  const loadWorkload = async () => {
    try {
      const res = await api.faculty.getWorkloadOverview();
      setWorkload(res.workloadOverview || []);
    } catch (err) {
      console.error('Failed to load workload:', err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.faculty.create(newFaculty);
      showFeedback('success', `Faculty ${newFaculty.full_name} registered! Emp Code: ${res.faculty.emp_code}`);
      setShowAddModal(false);
      loadFaculty();
      loadWorkload();
    } catch (err) {
      showFeedback('error', `Failed to register faculty: ${err.message}`);
    }
  };

  const handleAllocateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.faculty.allocateSubject(allocForm.faculty_id, {
        subject_id: allocForm.subject_id,
        division_id: allocForm.division_id
      });
      showFeedback('success', 'Subject allocated to faculty successfully!');
      setShowAllocateModal(false);
      loadFaculty();
      loadWorkload();
    } catch (err) {
      showFeedback('error', `Allocation failed: ${err.message}`);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.faculty.applyLeave(leaveForm);
      showFeedback('success', 'Leave request submitted successfully!');
      setShowLeaveModal(false);
      setLeaveForm({ leave_type: 'CASUAL', start_date: '', end_date: '', days_count: 1, reason: '' });
      loadLeaves();
    } catch (err) {
      showFeedback('error', `Leave application failed: ${err.message}`);
    }
  };

  const handleLeaveStatus = async (id, status) => {
    try {
      await api.faculty.updateLeaveStatus(id, { status });
      showFeedback('success', `Leave request ${status.toLowerCase()}!`);
      loadLeaves();
    } catch (err) {
      showFeedback('error', `Failed to update leave: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Faculty & Staff Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Faculty profiles, department allocations, subject assignments, leave requests, and workload tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowLeaveModal(true)}>
            <Calendar size={14} /> Apply for Leave
          </button>
          {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <UserPlus size={15} /> Add Faculty
            </button>
          )}
        </div>
      </div>

      {feedback && <AlertBanner type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        <button className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`} onClick={() => setActiveTab('directory')}>
          <GraduationCap size={15} /> Faculty Cadre ({faculty.length})
        </button>
        <button className={`tab-btn ${activeTab === 'allocations' ? 'active' : ''}`} onClick={() => setActiveTab('allocations')}>
          <Layers size={15} /> Subject Allocations
        </button>
        <button className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
          <Calendar size={15} /> Leave Requests ({leaves.length})
        </button>
        <button className={`tab-btn ${activeTab === 'workload' ? 'active' : ''}`} onClick={() => setActiveTab('workload')}>
          <Clock size={15} /> Workload Analysis
        </button>
      </div>

      {/* =========================================================================
          TAB 1: FACULTY DIRECTORY
          ========================================================================= */}
      {activeTab === 'directory' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search faculty by name, code, or specialization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFaculty()}
                style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="">All Departments</option>
              <option value="dept-comp">Computer Engineering</option>
              <option value="dept-it">Information Technology</option>
              <option value="dept-entc">Electronics & Telecom</option>
              <option value="dept-mech">Mechanical Engineering</option>
            </select>
          </div>

          <DataTable
            columns={[
              {
                key: 'emp_code',
                header: 'Emp Code',
                render: (val) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>{val}</span>
              },
              {
                key: 'full_name',
                header: 'Faculty Member',
                render: (val, row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={row.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{val}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.designation}</div>
                    </div>
                  </div>
                )
              },
              {
                key: 'department_name',
                header: 'Department',
                render: (val, row) => <span className="badge badge-info">{row.department_code || val}</span>
              },
              {
                key: 'qualification',
                header: 'Qualification & Specialization',
                render: (val, row) => (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{val}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.specialization}</div>
                  </div>
                )
              },
              {
                key: 'allocatedSubjects',
                header: 'Teaching Load',
                render: (val) => (
                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                    {val?.length || 0} Subjects
                  </span>
                )
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, row) => (
                  ['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setAllocForm({ ...allocForm, faculty_id: row.id });
                        setSelectedFaculty(row);
                        setShowAllocateModal(true);
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      <Plus size={13} /> Allocate Subject
                    </button>
                  )
                )
              }
            ]}
            data={faculty}
            loading={loading}
            pageSize={8}
            emptyMessage="No faculty members found."
          />
        </div>
      )}

      {/* =========================================================================
          TAB 2: SUBJECT ALLOCATIONS
          ========================================================================= */}
      {activeTab === 'allocations' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Faculty Subject & Division Teaching Allocations</h4>
            {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAllocateModal(true)}>
                <Plus size={14} /> New Subject Allocation
              </button>
            )}
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Faculty Member</th>
                    <th style={{ padding: '10px 14px' }}>Department</th>
                    <th style={{ padding: '10px 14px' }}>Assigned Subjects & Divisions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {f.full_name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({f.emp_code})</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-info">{f.department_code}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {f.allocatedSubjects?.length > 0 ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {f.allocatedSubjects.map(sub => (
                              <span key={sub.alloc_id} className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{sub.code}</strong> - {sub.name} ({sub.division_name})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No subjects allocated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LEAVE REQUESTS
          ========================================================================= */}
      {activeTab === 'leaves' && (
        <div>
          <DataTable
            columns={[
              {
                key: 'faculty_name',
                header: 'Faculty Member',
                render: (val, row) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.emp_code} • {row.department_name}</div>
                  </div>
                )
              },
              {
                key: 'leave_type',
                header: 'Leave Type',
                render: (val) => <span className="badge badge-secondary">{val} LEAVE</span>
              },
              {
                key: 'start_date',
                header: 'Leave Duration',
                render: (val, row) => `${val} to ${row.end_date} (${row.days_count} Days)`
              },
              {
                key: 'reason',
                header: 'Reason',
                render: (val) => <span style={{ fontSize: '0.82rem' }}>{val}</span>
              },
              {
                key: 'status',
                header: 'Status',
                render: (val) => (
                  <span className={`badge badge-${val === 'APPROVED' ? 'success' : val === 'REJECTED' ? 'danger' : 'warning'}`}>
                    {val}
                  </span>
                )
              },
              {
                key: 'actions',
                header: 'Action',
                align: 'right',
                render: (_, row) => (
                  ['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && row.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#10b981' }} onClick={() => handleLeaveStatus(row.id, 'APPROVED')}>
                        Approve
                      </button>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleLeaveStatus(row.id, 'REJECTED')}>
                        Reject
                      </button>
                    </div>
                  ) : null
                )
              }
            ]}
            data={leaves}
            pageSize={8}
            emptyMessage="No leave requests filed."
          />
        </div>
      )}

      {/* =========================================================================
          TAB 4: WORKLOAD ANALYSIS
          ========================================================================= */}
      {activeTab === 'workload' && (
        <div>
          <DataTable
            columns={[
              {
                key: 'full_name',
                header: 'Faculty Member',
                render: (val, row) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.emp_code} • {row.department_name}</div>
                  </div>
                )
              },
              {
                key: 'designation',
                header: 'Cadre',
                render: (val) => val
              },
              {
                key: 'allocated_subjects_count',
                header: 'Subjects',
                align: 'center',
                render: (val) => val
              },
              {
                key: 'scheduled_lecture_hours',
                header: 'Assigned Teaching Hours',
                render: (val, row) => (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700 }}>{val} hrs/week</span>
                      <span style={{ color: 'var(--text-muted)' }}>Max: {row.max_allowed_hours} hrs</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((val / row.max_allowed_hours) * 100, 100)}%`, height: '100%', background: val > row.max_allowed_hours ? '#ef4444' : '#2563eb' }} />
                    </div>
                  </div>
                )
              },
              {
                key: 'status',
                header: 'Workload Status',
                render: (_, row) => {
                  const pct = Math.round((row.scheduled_lecture_hours / row.max_allowed_hours) * 100);
                  if (pct >= 85) return <span className="badge badge-success">OPTIMAL LOAD</span>;
                  if (pct >= 50) return <span className="badge badge-info">BALANCED</span>;
                  return <span className="badge badge-warning">UNDER-ALLOCATED</span>;
                }
              }
            ]}
            data={workload}
            pageSize={8}
            emptyMessage="No faculty workload records available."
          />
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Register Faculty Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Faculty Member"
        subtitle="Registers academic faculty with login credentials and workload parameters"
        icon={UserPlus}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddSubmit}><Check size={16} /> Register Faculty</button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-row">
            <FormField label="Full Name" required>
              <input
                type="text"
                required
                placeholder="Dr. Rakesh Sharma"
                className="form-input"
                value={newFaculty.full_name}
                onChange={(e) => setNewFaculty({ ...newFaculty, full_name: e.target.value })}
              />
            </FormField>
            <FormField label="Designation" required>
              <select
                className="form-input"
                value={newFaculty.designation}
                onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Department" required>
              <select
                className="form-input"
                value={newFaculty.department_id}
                onChange={(e) => setNewFaculty({ ...newFaculty, department_id: e.target.value })}
              >
                <option value="dept-comp">Computer Engineering</option>
                <option value="dept-it">Information Technology</option>
                <option value="dept-entc">Electronics & Telecom</option>
                <option value="dept-mech">Mechanical Engineering</option>
              </select>
            </FormField>
            <FormField label="Max Workload (Hrs/Wk)" required>
              <input
                type="number"
                required
                className="form-input"
                value={newFaculty.weekly_workload_hours}
                onChange={(e) => setNewFaculty({ ...newFaculty, weekly_workload_hours: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Official Email" required>
              <input
                type="email"
                required
                placeholder="rakesh.sharma@aitpune.edu.in"
                className="form-input"
                value={newFaculty.email}
                onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
              />
            </FormField>
            <FormField label="Phone Number">
              <input
                type="tel"
                placeholder="+91 98221 11223"
                className="form-input"
                value={newFaculty.phone}
                onChange={(e) => setNewFaculty({ ...newFaculty, phone: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Highest Qualification & Specialization">
            <input
              type="text"
              placeholder="Ph.D. in Computer Science (Distributed Systems)"
              className="form-input"
              value={newFaculty.specialization}
              onChange={(e) => setNewFaculty({ ...newFaculty, specialization: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>

      {/* 2. Subject Allocation Modal */}
      <Modal
        isOpen={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        title="Allocate Course Subject to Faculty"
        subtitle={selectedFaculty ? `Faculty: ${selectedFaculty.full_name} (${selectedFaculty.emp_code})` : 'Allocate Teaching Subject'}
        icon={Layers}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAllocateSubject}><Check size={16} /> Save Allocation</button>
          </>
        }
      >
        <form onSubmit={handleAllocateSubject}>
          {!selectedFaculty && (
            <FormField label="Select Faculty Member" required>
              <select
                className="form-input"
                value={allocForm.faculty_id}
                onChange={(e) => setAllocForm({ ...allocForm, faculty_id: e.target.value })}
                required
              >
                <option value="">-- Choose Faculty --</option>
                {faculty.map(f => (
                  <option key={f.id} value={f.id}>{f.full_name} ({f.emp_code}) - {f.department_code}</option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Curriculum Course / Subject" required>
            <select
              className="form-input"
              value={allocForm.subject_id}
              onChange={(e) => setAllocForm({ ...allocForm, subject_id: e.target.value })}
            >
              <option value="sub-cs501">CS501 - Database Management Systems</option>
              <option value="sub-cs502">CS502 - Advanced Computer Networks</option>
              <option value="sub-cs503">CS503 - Theory of Computation</option>
              <option value="sub-it501">IT501 - Cloud Computing & DevOps</option>
              <option value="sub-ec501">EC501 - Microcontrollers & Embedded Systems</option>
            </select>
          </FormField>

          <FormField label="Class Division / Section" required>
            <select
              className="form-input"
              value={allocForm.division_id}
              onChange={(e) => setAllocForm({ ...allocForm, division_id: e.target.value })}
            >
              <option value="div-comp-5a">TE COMP Division A</option>
              <option value="div-comp-5b">TE COMP Division B</option>
              <option value="div-it-5a">TE IT Division A</option>
              <option value="div-entc-5a">TE ENTC Division A</option>
            </select>
          </FormField>
        </form>
      </Modal>

      {/* 3. Apply Leave Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Submit Faculty Leave Request"
        subtitle="Applies for official institutional leave with automated workflow approvals"
        icon={Calendar}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleApplyLeave}><Check size={16} /> Submit Request</button>
          </>
        }
      >
        <form onSubmit={handleApplyLeave}>
          <FormField label="Leave Category" required>
            <select
              className="form-input"
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
            >
              <option value="CASUAL">Casual Leave (CL)</option>
              <option value="MEDICAL">Medical Leave (ML)</option>
              <option value="DUTY">On Duty (OD) - Conference / University Duty</option>
              <option value="EARNED">Earned Leave (EL)</option>
            </select>
          </FormField>

          <div className="form-row">
            <FormField label="Start Date" required>
              <input
                type="date"
                required
                className="form-input"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
              />
            </FormField>

            <FormField label="End Date" required>
              <input
                type="date"
                required
                className="form-input"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Total Days Count" required>
            <input
              type="number"
              required
              min="1"
              className="form-input"
              value={leaveForm.days_count}
              onChange={(e) => setLeaveForm({ ...leaveForm, days_count: Number(e.target.value) })}
            />
          </FormField>

          <FormField label="Reason & Alternate Arrangement Notes" required>
            <textarea
              required
              rows={3}
              placeholder="e.g., Attending research symposium. Classes will be covered by Prof. Sharma."
              className="form-input"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
