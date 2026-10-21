import React, { useState, useEffect } from 'react';
import { ShieldCheck, Award, FileText, CheckCircle2, Clock, UploadCloud, Edit3, X, Check } from 'lucide-react';
import { api } from '../services/api';

export default function NaacPage({ user }) {
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedCriterion, setSelectedCriterion] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Evidence Modal State
  const [editingMetric, setEditingMetric] = useState(null);
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [status, setStatus] = useState('READY');

  useEffect(() => {
    loadData();
  }, [selectedCriterion]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCriterion) params.criterion_number = selectedCriterion;
      const res = await api.naac.getMetrics(params);
      setMetrics(res.metrics || []);

      const sumRes = await api.naac.getSummary();
      setSummary(sumRes);
    } catch (err) {
      console.error('Failed to load NAAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (m) => {
    setEditingMetric(m);
    setEvidenceSummary(m.evidence_summary || '');
    setStatus(m.status);
  };

  const handleSaveEvidence = async (e) => {
    e.preventDefault();
    if (!editingMetric) return;
    try {
      await api.naac.updateMetric(editingMetric.id, {
        evidence_summary: evidenceSummary,
        status: status
      });
      alert('Quality assurance evidence documentation updated!');
      setEditingMetric(null);
      loadData();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>NAAC & NBA Accreditation Quality Workspace</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Evidence documentation repository mapped to Criteria 1-7 for institutional quality assessment
          </p>
        </div>
      </div>

      {/* Readiness Stats */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Overall Evidence Readiness</span>
              <span className="stat-value" style={{ color: '#059669' }}>
                {summary.overall_readiness_pct}%
              </span>
              <span className="stat-trend positive">NAAC A++ Benchmark Targeted</span>
            </div>
            <div className="stat-icon green"><ShieldCheck size={22} /></div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Verified Evidence Files</span>
              <span className="stat-value">{summary.summary?.total_evidence_files || 50}</span>
              <span className="stat-trend neutral">Supporting Documentation Uploads</span>
            </div>
            <div className="stat-icon blue"><FileText size={22} /></div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Metrics In Review</span>
              <span className="stat-value" style={{ color: '#d97706' }}>
                {summary.summary?.review_count || 1}
              </span>
              <span className="stat-trend neutral">Internal Quality Assurance Cell (IQAC)</span>
            </div>
            <div className="stat-icon amber"><Clock size={22} /></div>
          </div>
        </div>
      )}

      {/* Filter by Criterion */}
      <div className="card" style={{ padding: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter by Criterion:</span>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '320px' }}
            value={selectedCriterion}
            onChange={(e) => setSelectedCriterion(e.target.value)}
          >
            <option value="">All Criteria (1 through 7)</option>
            <option value="1">Criterion 1: Curricular Aspects</option>
            <option value="2">Criterion 2: Teaching-Learning and Evaluation</option>
            <option value="3">Criterion 3: Research, Innovations and Extension</option>
            <option value="4">Criterion 4: Infrastructure and Learning Resources</option>
            <option value="5">Criterion 5: Student Support and Progression</option>
            <option value="6">Criterion 6: Governance, Leadership and Management</option>
            <option value="7">Criterion 7: Institutional Values and Best Practices</option>
          </select>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric Code</th>
              <th>Criterion & Title</th>
              <th>Department</th>
              <th>Evidence Summary</th>
              <th>Files Attached</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.id}>
                <td><code style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.metric_code}</code></td>
                <td>
                  <strong>{m.metric_title}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.criterion_title}</div>
                </td>
                <td>{m.department_code || 'Central'}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                  {m.evidence_summary}
                </td>
                <td>
                  <span className="badge badge-neutral">
                    {m.documents_count} Files
                  </span>
                </td>
                <td>
                  <span className={`badge ${m.status === 'READY' || m.status === 'SUBMITTED' ? 'badge-success' : 'badge-warning'}`}>
                    {m.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(m)}>
                      <Edit3 size={13} />
                      <span>Edit Evidence</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Evidence Modal */}
      {editingMetric && (
        <div className="modal-overlay" onClick={() => setEditingMetric(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Update Quality Evidence ({editingMetric.metric_code})</h3>
              <button className="icon-btn" onClick={() => setEditingMetric(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEvidence}>
              <div className="modal-body">
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>
                  {editingMetric.metric_title}
                </div>

                <div className="form-group">
                  <label className="form-label">Compliance Status *</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="READY">Ready & Verified</option>
                    <option value="IN_REVIEW">In IQAC Review</option>
                    <option value="SUBMITTED">Submitted to Portal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Evidence Summary & Artifacts Description *</label>
                  <textarea
                    rows="4"
                    required
                    className="form-textarea"
                    value={evidenceSummary}
                    onChange={(e) => setEvidenceSummary(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMetric(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
