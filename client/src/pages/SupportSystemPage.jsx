import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Sparkles, UserCheck, MessageSquare, RefreshCw, CheckCircle2, ChevronRight, X, Check } from 'lucide-react';
import { api } from '../services/api';

export default function SupportSystemPage({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [counselNotes, setCounselNotes] = useState('');

  useEffect(() => {
    loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.supportSystem.getAlerts();
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error('Failed to load support alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await api.supportSystem.runScan();
      alert(`Diagnostic Scan Complete: Created ${res.newAlertsCreated} alerts, Updated ${res.alertsUpdated} records.`);
      loadAlerts();
    } catch (err) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleLogCounseling = async (e) => {
    e.preventDefault();
    if (!activeAlert) return;
    try {
      await api.supportSystem.logCounseling({
        alert_id: activeAlert.id,
        counseling_notes: counselNotes,
        status: 'COUNSELED'
      });
      alert('Mentoring intervention session logged successfully!');
      setActiveAlert(null);
      setCounselNotes('');
      loadAlerts();
    } catch (err) {
      alert(`Error logging mentoring: ${err.message}`);
    }
  };

  const criticalCount = alerts.filter(a => a.risk_level === 'CRITICAL').length;
  const moderateCount = alerts.filter(a => a.risk_level === 'MODERATE').length;
  const counseledCount = alerts.filter(a => a.status === 'COUNSELED').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Early Academic Support & Mentoring System</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Explainable early-warning indicators, faculty mentoring logs, and proactive student assistance
          </p>
        </div>

        {['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'].includes(user?.role) && (
          <button 
            className="btn btn-primary"
            disabled={scanning}
            onClick={handleRunScan}
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', border: 'none' }}
          >
            <RefreshCw size={15} className={scanning ? 'spin' : ''} />
            <span>Run Diagnostic Risk Scan</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Critical Intervention Needed</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>{criticalCount}</span>
            <span className="stat-trend negative">Attendance &lt;65% or Multiple CIE Fails</span>
          </div>
          <div className="stat-icon rose"><AlertTriangle size={22} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Moderate Watchlist</span>
            <span className="stat-value" style={{ color: '#d97706' }}>{moderateCount}</span>
            <span className="stat-trend neutral">Attendance 65-75% Range</span>
          </div>
          <div className="stat-icon amber"><ShieldAlert size={22} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Counseled / In Remedial</span>
            <span className="stat-value" style={{ color: '#059669' }}>{counseledCount}</span>
            <span className="stat-trend positive">Faculty Mentoring Underway</span>
          </div>
          <div className="stat-icon green"><UserCheck size={22} /></div>
        </div>
      </div>

      {/* Principle Note */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', fontSize: '0.8125rem', color: '#1e40af', marginBottom: '20px' }}>
        <strong>Transparent Mentoring Principle:</strong> Indicators are designed for compassionate institutional support rather than disciplinary labeling. Human faculty review is required before consequential interventions.
      </div>

      {/* Alerts Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>PRN</th>
              <th>Department</th>
              <th>Risk Severity</th>
              <th>Explainable Diagnostic Factors</th>
              <th>Recommended Faculty Action</th>
              <th>Mentor</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => {
              const factors = a.parsed_factors || {};
              return (
                <tr key={a.id}>
                  <td><strong>{a.student_name}</strong></td>
                  <td><code>{a.prn}</code></td>
                  <td>{a.department_code}</td>
                  <td>
                    <span className={`badge ${a.risk_level === 'CRITICAL' ? 'badge-danger' : a.risk_level === 'MODERATE' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontWeight: 700 }}>
                      {a.risk_level}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                      • Attendance: <strong style={{ color: a.attendance_pct < 75 ? '#dc2626' : 'inherit' }}>{a.attendance_pct}%</strong>
                      {factors.failed_internal_subjects?.length > 0 && (
                        <div style={{ color: '#dc2626' }}>
                          • Failed CIE: {factors.failed_internal_subjects.join(', ')}
                        </div>
                      )}
                      {factors.pending_fee_dues > 0 && (
                        <div style={{ color: 'var(--text-muted)' }}>
                          • Pending Dues: ₹{factors.pending_fee_dues.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                    {a.recommended_action}
                  </td>
                  <td>{a.mentor_name || 'Dr. Rajesh Sharma'}</td>
                  <td>
                    <span className={`badge ${a.status === 'COUNSELED' ? 'badge-success' : a.status === 'RESOLVED' ? 'badge-neutral' : 'badge-warning'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'].includes(user?.role) && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setActiveAlert(a); setCounselNotes(''); }}
                      >
                        <MessageSquare size={13} />
                        <span>Log Mentoring</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Log Counseling Modal */}
      {activeAlert && (
        <div className="modal-overlay" onClick={() => setActiveAlert(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log Faculty Mentoring Session</h3>
              <button className="icon-btn" onClick={() => setActiveAlert(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleLogCounseling}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                  <div><strong>Student:</strong> {activeAlert.student_name} (PRN: {activeAlert.prn})</div>
                  <div><strong>Severity Level:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>{activeAlert.risk_level}</span></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mentoring Notes & Action Taken *</label>
                  <textarea
                    rows="4"
                    required
                    className="form-textarea"
                    placeholder="Document discussion with student, root cause (e.g. sickness, conceptual difficulty), remedial extra classes assigned, or parent communication..."
                    value={counselNotes}
                    onChange={(e) => setCounselNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveAlert(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>Save Mentoring Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
