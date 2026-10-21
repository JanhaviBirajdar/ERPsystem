import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Building, DollarSign, CheckCircle2, Plus, Calendar, 
  MapPin, X, Check, Award, Clock, Video, UserCheck, AlertCircle, 
  FileText, ExternalLink, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function PlacementPage({ user }) {
  const [activeTab, setActiveTab] = useState('drives');
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
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

  // Schedule Interview Modal State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    application_id: '',
    round_name: 'TECHNICAL_1',
    scheduled_at: '2026-11-18T10:00',
    mode: 'ONLINE',
    venue_or_link: 'https://meet.google.com/ait-tech-round'
  });

  // Outcome Review Modal State
  const [selectedInterviewForOutcome, setSelectedInterviewForOutcome] = useState(null);
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: 'SELECTED',
    feedback: 'Candidate displayed strong system design and data structures fundamentals.',
    offer_ctc: 12.0
  });

  useEffect(() => {
    loadDrives();
    loadApplications();
    loadInterviews();
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

  const loadInterviews = async () => {
    try {
      const res = await api.placement.getInterviews();
      setInterviews(res.interviews || []);
    } catch (err) {
      console.error('Failed to load interviews:', err);
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

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    try {
      await api.placement.scheduleInterview(interviewForm);
      alert('Interview slot scheduled and invitation dispatched to student!');
      setShowInterviewModal(false);
      loadInterviews();
      loadApplications();
    } catch (err) {
      alert(`Scheduling failed: ${err.message}`);
    }
  };

  const handleSaveOutcome = async (e) => {
    e.preventDefault();
    if (!selectedInterviewForOutcome) return;
    try {
      await api.placement.updateInterviewOutcome(selectedInterviewForOutcome.id, outcomeForm);
      alert(`Interview outcome (${outcomeForm.outcome}) recorded and candidate records updated!`);
      setSelectedInterviewForOutcome(null);
      loadInterviews();
      loadApplications();
      loadStats();
    } catch (err) {
      alert(`Failed to save outcome: ${err.message}`);
    }
  };

  const isPlacementOfficerOrAdmin = ['SUPER_ADMIN', 'PLACEMENT_OFFICER'].includes(user?.role);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase className="text-primary" size={24} />
            Training & Placement Cell (T&P)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Corporate recruitment drives, eligibility rules, technical interview tracking, and offer letters
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isPlacementOfficerOrAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowInterviewModal(true)}>
                <Calendar size={14} />
                <span>Schedule Interview Round</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                <Plus size={14} />
                <span>Announce Placement Drive</span>
              </button>
            </>
          )}
        </div>
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
              <span className="stat-trend positive">Premier Offer</span>
            </div>
            <div className="stat-icon purple"><Briefcase size={22} /></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeTab === 'drives' ? 'active' : ''}`} 
          onClick={() => setActiveTab('drives')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'drives' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'drives' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Recruitment Drives ({drives.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} 
          onClick={() => setActiveTab('applications')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'applications' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'applications' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Applicant Progress & Shortlists ({applications.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'interviews' ? 'active' : ''}`} 
          onClick={() => setActiveTab('interviews')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'interviews' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'interviews' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Interview Rounds & Evaluations ({interviews.length})
        </button>
      </div>

      {/* TAB 1: DRIVES */}
      {activeTab === 'drives' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {drives.map(drive => (
            <div key={drive.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                      {drive.logo_letter || drive.company_name.charAt(0)}
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

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Applicants: <strong>{drive.applicants_count || 0}</strong>
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

      {/* TAB 2: APPLICATIONS */}
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
                    <span className={`badge ${
                      app.status === 'OFFERED' ? 'badge-success' : 
                      app.status === 'SHORTLISTED' || app.status === 'TECHNICAL_ROUND' ? 'badge-info' : 
                      app.status === 'REJECTED' ? 'badge-danger' : 'badge-neutral'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isPlacementOfficerOrAdmin && app.status !== 'OFFERED' && (
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

      {/* TAB 3: INTERVIEWS & ROUNDS */}
      {activeTab === 'interviews' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Interview ID</th>
                <th>Candidate</th>
                <th>Company & Role</th>
                <th>Round Type</th>
                <th>Date & Time</th>
                <th>Venue / Meeting Link</th>
                <th>Outcome</th>
                <th style={{ textAlign: 'right' }}>Evaluation Action</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(inv => (
                <tr key={inv.id}>
                  <td><code>{inv.id}</code></td>
                  <td>
                    <strong>{inv.student_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {inv.roll_no} | PRN: {inv.prn}</div>
                  </td>
                  <td>
                    <strong>{inv.company_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.role_title}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{inv.round_name}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} color="var(--text-muted)" />
                      <span>{new Date(inv.scheduled_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td>
                    {inv.venue_or_link.startsWith('http') ? (
                      <a href={inv.venue_or_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <Video size={13} /> Join Virtual Round
                      </a>
                    ) : (
                      <span>{inv.venue_or_link}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      inv.outcome === 'SELECTED' ? 'badge-success' :
                      inv.outcome === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {inv.outcome}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isPlacementOfficerOrAdmin && inv.outcome === 'PENDING' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedInterviewForOutcome(inv);
                          setOutcomeForm({
                            outcome: 'SELECTED',
                            feedback: 'Strong coding round performance, cleared all test cases.',
                            offer_ctc: inv.ctc_lpa || 10.0
                          });
                        }}
                      >
                        <UserCheck size={14} />
                        <span>Assess Round</span>
                      </button>
                    )}
                    {inv.outcome === 'SELECTED' && (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                        Selected ✓
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {interviews.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No interview rounds scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {showInterviewModal && (
        <div className="modal-overlay" onClick={() => setShowInterviewModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Schedule Technical / HR Round</h3>
              <button className="icon-btn" onClick={() => setShowInterviewModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleScheduleInterview}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Select Shortlisted Candidate *</label>
                <select 
                  className="form-select"
                  value={interviewForm.application_id}
                  onChange={e => setInterviewForm({...interviewForm, application_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose Candidate Application --</option>
                  {applications.filter(a => a.status !== 'REJECTED').map(a => (
                    <option key={a.id} value={a.id}>
                      {a.student_name} - {a.company_name} ({a.role_title})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Round Stage:</label>
                  <select 
                    className="form-select"
                    value={interviewForm.round_name}
                    onChange={e => setInterviewForm({...interviewForm, round_name: e.target.value})}
                  >
                    <option value="ONLINE_ASSESSMENT">Online Assessment</option>
                    <option value="TECHNICAL_1">Technical Interview 1</option>
                    <option value="TECHNICAL_2">Technical Interview 2</option>
                    <option value="HR_ROUND">HR & Managerial Round</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mode:</label>
                  <select 
                    className="form-select"
                    value={interviewForm.mode}
                    onChange={e => setInterviewForm({...interviewForm, mode: e.target.value})}
                  >
                    <option value="ONLINE">Online Virtual</option>
                    <option value="OFFLINE">Offline In-Person</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Date & Time *</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={interviewForm.scheduled_at}
                  onChange={e => setInterviewForm({...interviewForm, scheduled_at: e.target.value})}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Venue / Meeting URL *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={interviewForm.venue_or_link}
                  onChange={e => setInterviewForm({...interviewForm, venue_or_link: e.target.value})}
                  placeholder="e.g., https://meet.google.com/ait-tech or T&P Interview Room 3"
                  required
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInterviewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Interview</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OUTCOME ASSESSMENT MODAL */}
      {selectedInterviewForOutcome && (
        <div className="modal-overlay" onClick={() => setSelectedInterviewForOutcome(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Record Interview Round Outcome</h3>
              <button className="icon-btn" onClick={() => setSelectedInterviewForOutcome(null)}><X size={18} /></button>
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><strong>Candidate:</strong> {selectedInterviewForOutcome.student_name}</div>
              <div><strong>Company:</strong> {selectedInterviewForOutcome.company_name}</div>
              <div><strong>Round:</strong> {selectedInterviewForOutcome.round_name}</div>
            </div>
            <form onSubmit={handleSaveOutcome}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Assessment Result:</label>
                <select 
                  className="form-select"
                  value={outcomeForm.outcome}
                  onChange={e => setOutcomeForm({...outcomeForm, outcome: e.target.value})}
                >
                  <option value="SELECTED">SELECTED (Advanced / Offered)</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                </select>
              </div>

              {outcomeForm.outcome === 'SELECTED' && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Offer CTC (LPA) if Final Round:</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-input" 
                    value={outcomeForm.offer_ctc}
                    onChange={e => setOutcomeForm({...outcomeForm, offer_ctc: e.target.value})}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Interviewer Notes & Feedback:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={outcomeForm.feedback}
                  onChange={e => setOutcomeForm({...outcomeForm, feedback: e.target.value})}
                  placeholder="Feedback on problem solving, communication, etc."
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedInterviewForOutcome(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANNOUNCE DRIVE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Announce Corporate Recruitment Drive</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDrive}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '12px' }}>
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
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
