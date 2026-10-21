import React, { useState, useEffect } from 'react';
import { GraduationCap, UserPlus, Search, BookOpen, Clock, Mail, Phone, X, Check } from 'lucide-react';
import { api } from '../services/api';

export default function FacultyPage({ user }) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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

  useEffect(() => {
    loadFaculty();
  }, [selectedDept]);

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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.faculty.create(newFaculty);
      alert(`Faculty member ${newFaculty.full_name} added successfully! Login credentials generated.`);
      setShowAddModal(false);
      loadFaculty();
    } catch (err) {
      alert(`Failed to add faculty: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Faculty & Academic Staff Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Faculty cadre, qualifications, weekly workload distribution, and subject allocations
          </p>
        </div>

        {['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} />
            <span>Add Faculty Member</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flex: '1 1 240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search faculty by name, employee code or specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadFaculty(); }}
            />
            <button className="btn btn-secondary" onClick={loadFaculty}>
              <Search size={15} />
            </button>
          </div>

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
        </div>
      </div>

      {/* Faculty Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {faculty.map(f => (
          <div key={f.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                <img 
                  src={f.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'} 
                  alt={f.full_name} 
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-border)' }}
                />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{f.full_name}</h3>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                    {f.designation}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Code: <code>{f.emp_code}</code> • {f.department_name}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-muted)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '12px' }}>
                <div><strong>Qualification:</strong> {f.qualification}</div>
                <div style={{ marginTop: '2px' }}><strong>Specialization:</strong> {f.specialization}</div>
                <div style={{ marginTop: '2px' }}><strong>Experience:</strong> {f.experience_years} Years</div>
              </div>

              {/* Allocated Subjects */}
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Allocated Subjects ({f.allocatedSubjects?.length || 0})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {f.allocatedSubjects?.map(s => (
                    <span key={s.alloc_id} className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {s.code}: {s.name}
                    </span>
                  ))}
                  {(!f.allocatedSubjects || f.allocatedSubjects.length === 0) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No current term allocations</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer workload badge */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                <Clock size={13} />
                Workload: <strong>{f.weekly_workload_hours} hrs/week</strong>
              </span>
              <span className="badge badge-success">Active Faculty</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Faculty Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Faculty</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Dr. Ramesh Chander"
                    value={newFaculty.full_name}
                    onChange={(e) => setNewFaculty({ ...newFaculty, full_name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="r.chander@aitpune.edu.in"
                      value={newFaculty.email}
                      onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+91 98220 XXXXX"
                      value={newFaculty.phone}
                      onChange={(e) => setNewFaculty({ ...newFaculty, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Designation *</label>
                    <select
                      className="form-select"
                      value={newFaculty.designation}
                      onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                    >
                      <option value="Professor">Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-select"
                      value={newFaculty.department_id}
                      onChange={(e) => setNewFaculty({ ...newFaculty, department_id: e.target.value })}
                    >
                      <option value="dept-comp">Computer Engineering</option>
                      <option value="dept-aids">AI & Data Science</option>
                      <option value="dept-entc">E&TC</option>
                      <option value="dept-mech">Mechanical Engineering</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Qualification & Degrees</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ph.D (IIT Delhi), M.Tech (CSE)"
                    value={newFaculty.qualification}
                    onChange={(e) => setNewFaculty({ ...newFaculty, qualification: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Research Specialization</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Cloud Computing, Cyber-Physical Systems"
                    value={newFaculty.specialization}
                    onChange={(e) => setNewFaculty({ ...newFaculty, specialization: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>Register Faculty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
