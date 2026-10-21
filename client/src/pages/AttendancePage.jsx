import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, QrCode, AlertTriangle, Plus, Users, 
  Clock, Calendar, Check, X, ShieldAlert, Download, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

export default function AttendancePage({ user }) {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeQrSession, setActiveQrSession] = useState(null);

  // QR Simulator input for student testing
  const [simulatedToken, setSimulatedToken] = useState('');
  const [qrScanSuccess, setQrScanSuccess] = useState(null);

  // New session state
  const [newSession, setNewSession] = useState({
    subject_id: 'sub-cs501',
    division_id: 'div-comp-5a',
    session_date: new Date().toISOString().split('T')[0],
    time_slot: '09:00 - 10:00',
    topic_covered: 'Relational Database Integrity Constraints & Triggers',
    session_type: 'Lecture',
    enable_qr: true
  });

  useEffect(() => {
    loadSessions();
    loadDefaulters();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await api.attendance.getSessions({ division_id: 'div-comp-5a' });
      setSessions(res.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaulters = async () => {
    try {
      const res = await api.attendance.getShortageReport({ threshold: 75 });
      setDefaulters(res.defaulters || []);
    } catch (err) {
      console.error('Failed to load defaulters:', err);
    }
  };

  const handleOpenSessionRecords = async (sessionId) => {
    try {
      const res = await api.attendance.getSession(sessionId);
      setSelectedSession(res.session);
      setSessionRecords(res.records || []);
    } catch (err) {
      alert(`Error loading session records: ${err.message}`);
    }
  };

  const handleToggleStudentStatus = (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : currentStatus === 'ABSENT' ? 'LATE' : 'PRESENT';
    setSessionRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, status: nextStatus } : r));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;
    try {
      await api.attendance.mark({
        session_id: selectedSession.id,
        records: sessionRecords.map(r => ({ student_id: r.student_id, status: r.status }))
      });
      alert('Attendance records updated successfully!');
      loadSessions();
      loadDefaulters();
    } catch (err) {
      alert(`Failed to save attendance: ${err.message}`);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const res = await api.attendance.createSession(newSession);
      alert('Attendance lecture session initialized!');
      setShowCreateModal(false);
      loadSessions();
      if (newSession.enable_qr && res.session?.qrToken) {
        setActiveQrSession({
          ...newSession,
          id: res.session.id,
          qr_token: res.session.qrToken,
          qr_expires_at: res.session.qrExpiresAt
        });
        setShowQrModal(true);
      }
    } catch (err) {
      alert(`Failed to create session: ${err.message}`);
    }
  };

  const handleSimulateQrScan = async () => {
    if (!simulatedToken.trim()) return;
    try {
      // Find session with this token
      const target = sessions.find(s => s.qr_token === simulatedToken) || activeQrSession;
      const targetSessionId = target ? target.id : 'att-ses-4';

      const res = await api.attendance.mark({
        session_id: targetSessionId,
        marked_via: 'QR',
        qr_token: simulatedToken.trim()
      });
      setQrScanSuccess(res.message);
      loadSessions();
      loadDefaulters();
    } catch (err) {
      alert(`QR Attendance Verification Failed: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Attendance & Anti-Replay QR Tracking</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Lecture-wise attendance logs, dynamic anti-counterfeit QR generation, and statutory 75% shortage monitors
          </p>
        </div>

        {['SUPER_ADMIN', 'HOD', 'FACULTY'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>Start Attendance Session</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Lecture Sessions & QR Generator
        </button>
        <button 
          className={`tab-btn ${activeTab === 'defaulters' ? 'active' : ''}`}
          onClick={() => setActiveTab('defaulters')}
        >
          Attendance Shortage Defaulters (&lt; 75%)
          {defaulters.length > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: '6px' }}>{defaulters.length}</span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: LECTURE SESSIONS & QR GENERATOR
          ========================================================================= */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr', gap: '24px' }}>
          {/* Sessions List */}
          <div>
            {/* Student QR Scanner Simulation Box */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                  <QrCode size={18} />
                  QR Attendance Scanner (Student Device Simulator)
                </span>
                <span className="badge badge-info" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
                  Anti-Replay Enabled
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '12px' }}>
                Students scan the dynamic QR code projected on screen. Try testing with active token: <code>SECURE-QR-TOKEN-AITPUNE-984321</code>
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter or scan QR token..."
                  value={simulatedToken}
                  onChange={(e) => setSimulatedToken(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <button className="btn btn-primary" onClick={handleSimulateQrScan}>
                  <Check size={16} />
                  <span>Verify QR Code</span>
                </button>
              </div>
              {qrScanSuccess && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                  ✅ {qrScanSuccess}
                </div>
              )}
            </div>

            {/* Sessions Cards */}
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Conducted Lecture Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map(s => (
                <div 
                  key={s.id} 
                  className="card"
                  style={{ 
                    cursor: 'pointer', 
                    borderLeft: selectedSession?.id === s.id ? '4px solid var(--primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: selectedSession?.id === s.id ? 'var(--primary-subtle)' : 'var(--bg-surface)'
                  }}
                  onClick={() => handleOpenSessionRecords(s.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {s.subject_code} • {s.session_type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {s.session_date} ({s.time_slot})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {s.subject_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Topic: {s.topic_covered}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Faculty: {s.faculty_name}</span>
                    <span className="badge badge-success">
                      {s.present_count} / {s.total_students || 10} Present
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Attendance Records Drawer */}
          {selectedSession && (
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">Mark / Review Attendance</h3>
                  <p className="card-subtitle">{selectedSession.subject_code}: {selectedSession.subject_name}</p>
                </div>
                <button className="icon-btn" onClick={() => setSelectedSession(null)}><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem' }}>
                  Click status button to toggle: <strong>Present ➔ Absent ➔ Late</strong>
                </span>
                <button className="btn btn-primary btn-sm" onClick={handleSaveAttendance}>
                  <Check size={14} />
                  <span>Save Attendance</span>
                </button>
              </div>

              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>
                      <th>Marked Via</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRecords.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.roll_no}</strong></td>
                        <td>
                          <div>{r.student_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.prn}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {r.marked_via}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={`badge ${r.status === 'PRESENT' ? 'badge-success' : r.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'}`}
                            style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.75rem', border: 'none' }}
                            onClick={() => handleToggleStudentStatus(r.student_id, r.status)}
                          >
                            {r.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ATTENDANCE SHORTAGE DEFAULTERS (< 75%)
          ========================================================================= */}
      {activeTab === 'defaulters' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Statutory Attendance Defaulter List</h3>
              <p className="card-subtitle">Students falling below mandatory 75% attendance threshold</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              <Download size={14} />
              <span>Export Defaulter List</span>
            </button>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>PRN</th>
                  <th>Department</th>
                  <th>Current Attendance</th>
                  <th>Guardian Name</th>
                  <th>Guardian Contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.roll_no}</strong></td>
                    <td><strong>{d.full_name}</strong></td>
                    <td><code>{d.prn}</code></td>
                    <td>{d.department_code}</td>
                    <td>
                      <span className="badge badge-danger" style={{ fontWeight: 700 }}>
                        {d.attendance_pct}%
                      </span>
                    </td>
                    <td>{d.guardian_name}</td>
                    <td><code>{d.guardian_phone}</code></td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => alert(`Intimation SMS & Email dispatched to guardian: ${d.guardian_phone}`)}
                      >
                        Send Intimation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE SESSION MODAL
          ========================================================================= */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Initialize Attendance Lecture Session</h3>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <select
                    className="form-select"
                    value={newSession.subject_id}
                    onChange={(e) => setNewSession({ ...newSession, subject_id: e.target.value })}
                  >
                    <option value="sub-cs501">CS501: Database Management Systems</option>
                    <option value="sub-cs502">CS502: Theory of Computation</option>
                    <option value="sub-cs503">CS503: Computer Networks</option>
                    <option value="sub-cs504">CS504: Artificial Intelligence & Machine Learning</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={newSession.session_date}
                      onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Slot *</label>
                    <select
                      className="form-select"
                      value={newSession.time_slot}
                      onChange={(e) => setNewSession({ ...newSession, time_slot: e.target.value })}
                    >
                      <option value="09:00 - 10:00">09:00 - 10:00 AM</option>
                      <option value="10:00 - 11:00">10:00 - 11:00 AM</option>
                      <option value="11:15 - 12:15">11:15 - 12:15 PM</option>
                      <option value="13:00 - 14:00">01:00 - 02:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Lecture Topic Covered *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. B-Trees & Indexing structures"
                    value={newSession.topic_covered}
                    onChange={(e) => setNewSession({ ...newSession, topic_covered: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="enableQrCheck"
                    checked={newSession.enable_qr}
                    onChange={(e) => setNewSession({ ...newSession, enable_qr: e.target.checked })}
                  />
                  <label htmlFor="enableQrCheck" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Generate Anti-Replay QR Code for Classroom Projection (15 min validity)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>Start Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE QR CODE MODAL FOR PROJECTOR
          ========================================================================= */}
      {showQrModal && activeQrSession && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '420px', textAlign: 'center', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
              Dynamic Attendance QR
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Project on classroom screen. Valid for 15 minutes.
            </p>

            <div style={{ width: '220px', height: '220px', background: '#0f172a', borderRadius: '16px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: 'var(--shadow-lg)' }}>
              <QrCode size={180} />
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '20px' }}>
              <div>Secure Dynamic Token:</div>
              <code style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                {activeQrSession.qr_token}
              </code>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowQrModal(false)}>
              Done / Close QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
