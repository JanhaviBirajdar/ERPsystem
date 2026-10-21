import React, { useState, useEffect } from 'react';
import { Briefcase, Building, DollarSign, CheckCircle2, Plus, Calendar, MapPin, X, Check, Award } from 'lucide-react';
import { api } from '../services/api';

export default function PlacementPage({ user }) {
  const [activeTab, setActiveTab] = useState('drives');
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Drive Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDrive, setNewDrive] = useState({
    company_name: '',
    role_title: 'Associate Software Engineer',
    ctc_lpa: 8.5,
    job_location: 'Pune / Bengaluru',
    min_cgpa: 7.0,
    eligible_departments: 'COMP,AIDS,ENTC',
    drive_date: '2026-11-15',
    registration_deadline: '2026-11-05',
    description: 'Core software engineering role focusing on cloud platforms and full-stack architecture.'
  });

  useEffect(() => {
    loadDrives();
    loadApplications();
    loadStats();
  }, [user]);

  const loadDrives = async () => {
    setLoading(true);
    try {
      const res = await api.placement.getDrives();
      setDrives(res.drives || []);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await api.placement.getApplications();
      setApplications(res.applications || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.placement.getStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleApply = async (driveId, companyName) => {
    try {
      await api.placement.apply(driveId);
      alert(`Applied successfully for ${companyName}! Profile submitted to Placement Cell.`);
      loadDrives();
      loadApplications();
    } catch (err) {
      alert(`Application not submitted: ${err.message}`);
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    try {
      await api.placement.createDrive(newDrive);
      alert(`Placement drive for ${newDrive.company_name} announced!`);
      setShowAddModal(false);
      loadDrives();
    } catch (err) {
      alert(`Error creating drive: ${err.message}`);
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
    try {
      await api.placement.updateStatus(appId, { status: newStatus });
      loadApplications();
      loadStats();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Training & Placement Cell (T&P)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Corporate recruitment drives, eligibility rules, aptitude rounds, and offer tracking
          </p>
        </div>

        {['SUPER_ADMIN', 'PLACEMENT_OFFICER'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} />
            <span>Announce Placement Drive</span>
          </button>
        )}
      </div>

      {/* Placement Stats Header */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Campus Placement Rate</span>
              <span className="stat-value" style={{ color: '#059669' }}>
                {stats.placement_percentage}%
              </span>
              <span className="stat-trend positive">Tier-1 Corporate Recruiting</span>
            </div>
            <div className="stat-icon green"><Award size={22} /></div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Average Annual Package</span>
              <span className="stat-value">₹{stats.average_ctc_lpa} LPA</span>
              <span className="stat-trend neutral">Median Tech Package</span>
            </div>
            <div className="stat-icon blue"><DollarSign size={22} /></div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Highest Package Bagged</span>
              <span className="stat-value" style={{ color: '#7c3aed' }}>
                ₹{stats.highest_ctc_lpa} LPA
              </span>
              <span className="stat-trend positive">Google India Premier Offer</span>
            </div>
            <div className="stat-icon purple"><Briefcase size={22} /></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'drives' ? 'active' : ''}`} onClick={() => setActiveTab('drives')}>
          Recruitment Drives ({drives.length})
        </button>
        <button className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
          Applicant Progress & Shortlists ({applications.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DRIVES
          ========================================================================= */}
      {activeTab === 'drives' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {drives.map(drive => (
            <div key={drive.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                      {drive.logo_letter}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{drive.company_name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>{drive.role_title}</div>
                    </div>
                  </div>
                  <span className={`badge ${drive.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                    {drive.status}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>CTC Package:</span><br/>
                    <strong style={{ fontSize: '1.1rem', color: '#059669' }}>₹{drive.ctc_lpa} LPA</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Min CGPA:</span><br/>
                    <strong>{drive.min_cgpa} / 10.0</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Eligible Branches:</span><br/>
                    <strong>{drive.eligible_departments}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Drive Date:</span> {drive.drive_date}
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '14px' }}>
                  {drive.description}
                </p>
              </div>

              {/* Action */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Applicants: <strong>{drive.applicants_count}</strong>
                </span>

                {user?.role === 'STUDENT' && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApply(drive.id, drive.company_name)}
                  >
                    Apply for Drive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          TAB 2: APPLICATIONS
          ========================================================================= */}
      {activeTab === 'applications' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>PRN</th>
                <th>Department</th>
                <th>CGPA</th>
                <th>Company</th>
                <th>Role</th>
                <th>Round Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td><strong>{app.student_name}</strong></td>
                  <td><code>{app.prn}</code></td>
                  <td>{app.department_code}</td>
                  <td><strong>{app.current_cgpa}</strong></td>
                  <td><strong>{app.company_name}</strong></td>
                  <td>{app.role_title}</td>
                  <td>
                    <span className={`badge ${app.status === 'OFFERED' ? 'badge-success' : app.status === 'SHORTLISTED' || app.status === 'TECHNICAL_ROUND' ? 'badge-info' : 'badge-neutral'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {['SUPER_ADMIN', 'PLACEMENT_OFFICER'].includes(user?.role) && app.status !== 'OFFERED' && (
                      <select 
                        className="form-select"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
                        value={app.status}
                        onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                      >
                        <option value="APPLIED">Applied</option>
                        <option value="SHORTLISTED">Shortlisted</option>
                        <option value="TECHNICAL_ROUND">Technical Round</option>
                        <option value="OFFERED">Offered 🎉</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    )}
                    {app.status === 'OFFERED' && (
                      <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                        Offer Issued!
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Announce Drive Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Announce Corporate Recruitment Drive</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDrive}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Microsoft India / Cisco Systems"
                    value={newDrive.company_name}
                    onChange={(e) => setNewDrive({ ...newDrive, company_name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Role Title *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={newDrive.role_title}
                      onChange={(e) => setNewDrive({ ...newDrive, role_title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CTC Package (LPA) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="form-input"
                      value={newDrive.ctc_lpa}
                      onChange={(e) => setNewDrive({ ...newDrive, ctc_lpa: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min CGPA Cutoff</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newDrive.min_cgpa}
                      onChange={(e) => setNewDrive({ ...newDrive, min_cgpa: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Drive Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newDrive.drive_date}
                      onChange={(e) => setNewDrive({ ...newDrive, drive_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Drive</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
