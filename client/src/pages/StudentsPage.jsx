import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Eye, Award, 
  CreditCard, BookOpen, AlertTriangle, X, Check, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { api } from '../services/api';

export default function StudentsPage({ user, onOpenIdCardForStudent }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [belowAttendance, setBelowAttendance] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Enrollment Form State
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    email: '',
    phone: '',
    department_id: 'dept-comp',
    semester_id: 'sem-5',
    category: 'OPEN',
    gender: 'Male',
    guardian_name: '',
    guardian_phone: '',
    address: '',
    blood_group: 'B+',
    abc_id: ''
  });

  useEffect(() => {
    loadStudents();
  }, [selectedDept, selectedCategory, belowAttendance]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department_id = selectedDept;
      if (selectedCategory) params.category = selectedCategory;
      if (belowAttendance) params.below_attendance = 75;
      if (search) params.search = search;

      const res = await api.students.getAll(params);
      setStudents(res.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStudents();
  };

  const handleViewProfile = async (id) => {
    try {
      const res = await api.students.getById(id);
      setSelectedStudent(res);
    } catch (err) {
      alert(`Error loading profile: ${err.message}`);
    }
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.students.enroll(newStudent);
      alert(`Student ${newStudent.full_name} enrolled successfully! Generated credentials and fee invoice.`);
      setShowEnrollModal(false);
      loadStudents();
    } catch (err) {
      alert(`Failed to enroll student: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Student Information System (SIS)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Authoritative student registry, 360° academic profiles, and quota allocations
          </p>
        </div>

        {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowEnrollModal(true)}>
            <UserPlus size={16} />
            <span>Enroll New Student</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, PRN, or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              <Search size={15} />
            </button>
          </form>

          {/* Department Filter */}
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '180px' }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="dept-comp">Computer Engineering</option>
            <option value="dept-aids">AI & Data Science</option>
            <option value="dept-entc">E&TC</option>
            <option value="dept-mech">Mechanical Engg</option>
          </select>

          {/* Category Quota Filter */}
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Quotas</option>
            <option value="OPEN">OPEN / General</option>
            <option value="OBC">OBC Quota</option>
            <option value="SC">SC Quota</option>
            <option value="ST">ST Quota</option>
            <option value="TFWS">TFWS Waiver</option>
          </select>

          {/* Low Attendance Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: belowAttendance ? '#dc2626' : 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={belowAttendance}
              onChange={(e) => setBelowAttendance(e.target.checked)}
            />
            <span>Shortage (&lt; 75%)</span>
          </label>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Student Details</th>
              <th>PRN</th>
              <th>Department & Sem</th>
              <th>Quota Category</th>
              <th>Attendance</th>
              <th>CGPA</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(st => (
              <tr key={st.id}>
                <td>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{st.roll_no}</strong>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={st.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'} 
                      alt={st.full_name} 
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{st.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <code style={{ fontSize: '0.78rem' }}>{st.prn}</code>
                </td>
                <td>
                  <div>{st.department_code}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem {st.semester_number || 5} • {st.division_name || 'Div A'}</div>
                </td>
                <td>
                  <span className="badge badge-neutral">
                    {st.category}
                  </span>
                </td>
                <td>
                  <span className={`badge ${st.attendance_pct >= 75 ? 'badge-success' : 'badge-danger'}`}>
                    {st.attendance_pct}%
                  </span>
                </td>
                <td>
                  <strong>{st.current_cgpa}</strong> / 10
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewProfile(st.id)}
                    title="View 360 Degree Profile"
                  >
                    <Eye size={14} />
                    <span>360° Profile</span>
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No students found matching your active filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          360-DEGREE STUDENT PROFILE MODAL
          ========================================================================= */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '850px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ background: '#0f172a', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img 
                  src={selectedStudent.student.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                  alt={selectedStudent.student.full_name} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }}
                />
                <div>
                  <h3 style={{ color: 'white', fontSize: '1.15rem', margin: 0 }}>
                    {selectedStudent.student.full_name}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                    PRN: {selectedStudent.student.prn} • Roll: {selectedStudent.student.roll_no} • {selectedStudent.student.department_name}
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedStudent(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Quick Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance Status</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: selectedStudent.student.attendance_pct >= 75 ? '#059669' : '#dc2626' }}>
                    {selectedStudent.student.attendance_pct}%
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {selectedStudent.student.attendance_pct >= 75 ? 'Compliant' : 'Shortage Alert'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cumulative CGPA</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {selectedStudent.student.current_cgpa} / 10.0
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Academic Record</span>
                </div>

                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fee Outstanding</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: selectedStudent.invoices[0]?.balance_amount > 0 ? '#dc2626' : '#059669' }}>
                    ₹{(selectedStudent.invoices[0]?.balance_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {selectedStudent.invoices[0]?.status || 'CLEARED'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quota Category</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {selectedStudent.student.category}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admission Quota</span>
                </div>
              </div>

              {/* Personal & Guardian Info */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>Personal & Guardian Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.8125rem' }}>
                  <div><strong>Phone:</strong> {selectedStudent.student.phone || 'N/A'}</div>
                  <div><strong>Guardian:</strong> {selectedStudent.student.guardian_name} ({selectedStudent.student.guardian_relation})</div>
                  <div><strong>Guardian Phone:</strong> {selectedStudent.student.guardian_phone}</div>
                  <div><strong>Blood Group:</strong> {selectedStudent.student.blood_group}</div>
                  <div><strong>Academic Bank of Credits:</strong> <code>{selectedStudent.student.abc_id}</code></div>
                  <div><strong>Address:</strong> {selectedStudent.student.address}</div>
                </div>
              </div>

              {/* Examination Marks */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>Continuous Internal Evaluation (CIE) Marks</h4>
                {selectedStudent.marks.length > 0 ? (
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Exam</th>
                        <th>Marks Obtained</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.marks.map((m, idx) => (
                        <tr key={idx}>
                          <td><strong>{m.subject_code}</strong> - {m.subject_name}</td>
                          <td>{m.exam_name}</td>
                          <td><strong>{m.marks_obtained}</strong> / {m.max_marks}</td>
                          <td><span className="badge badge-info">{m.grade_letter} ({m.grade_point})</span></td>
                          <td>{m.is_locked ? '🔒 Locked' : 'Draft'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No marks recorded yet for this semester.</p>
                )}
              </div>

              {/* Library & Placement status */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>Campus Services & Placement Drives</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.8rem' }}>
                  <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px' }}>
                    <strong>📚 Library Books on Loan ({selectedStudent.bookLoans.length})</strong>
                    {selectedStudent.bookLoans.map((b, idx) => (
                      <div key={idx} style={{ marginTop: '6px' }}>
                        • {b.title} (Due: {b.due_date}) {b.status === 'OVERDUE' && <span style={{ color: '#dc2626' }}>[OVERDUE]</span>}
                      </div>
                    ))}
                    {selectedStudent.bookLoans.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No active loans</div>}
                  </div>

                  <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px' }}>
                    <strong>💼 Placement Drives Applied ({selectedStudent.placementApps.length})</strong>
                    {selectedStudent.placementApps.map((p, idx) => (
                      <div key={idx} style={{ marginTop: '6px' }}>
                        • {p.company_name} ({p.role_title}) - <strong>{p.status}</strong>
                      </div>
                    ))}
                    {selectedStudent.placementApps.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No active drive registrations</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedStudent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ENROLL STUDENT MODAL
          ========================================================================= */}
      {showEnrollModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Enroll New Student</h3>
              <button className="icon-btn" onClick={() => setShowEnrollModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEnrollSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Vikramaditya Rathore"
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="vikram.r@aitpune.edu.in"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+91 98230 XXXXX"
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-select"
                      value={newStudent.department_id}
                      onChange={(e) => setNewStudent({ ...newStudent, department_id: e.target.value })}
                    >
                      <option value="dept-comp">Computer Engineering</option>
                      <option value="dept-aids">AI & Data Science</option>
                      <option value="dept-entc">E&TC</option>
                      <option value="dept-mech">Mechanical Engineering</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quota Category *</label>
                    <select
                      className="form-select"
                      value={newStudent.category}
                      onChange={(e) => setNewStudent({ ...newStudent, category: e.target.value })}
                    >
                      <option value="OPEN">OPEN / General Quota</option>
                      <option value="OBC">OBC Quota</option>
                      <option value="SC">SC Quota</option>
                      <option value="ST">ST Quota</option>
                      <option value="TFWS">TFWS Waiver</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Guardian Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Father / Guardian Name"
                      value={newStudent.guardian_name}
                      onChange={(e) => setNewStudent({ ...newStudent, guardian_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guardian Contact</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+91 98221 XXXXX"
                      value={newStudent.guardian_phone}
                      onChange={(e) => setNewStudent({ ...newStudent, guardian_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>Submit Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
