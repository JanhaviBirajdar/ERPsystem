import React, { useState, useEffect } from 'react';
import { Settings, Shield, Clock, Database, Check, Building, Save } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage({ user }) {
  const [activeTab, setActiveTab] = useState('institution');
  const [institution, setInstitution] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Institution form state
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    naac_grade: 'A++'
  });

  useEffect(() => {
    loadInstitution();
    loadAuditLogs();
  }, []);

  const loadInstitution = async () => {
    try {
      const res = await api.institution.get();
      if (res.institution) {
        setInstitution(res.institution);
        setFormData({
          name: res.institution.name,
          tagline: res.institution.tagline || '',
          address: res.institution.address || '',
          phone: res.institution.phone || '',
          email: res.institution.email || '',
          website: res.institution.website || '',
          naac_grade: res.institution.naac_grade || 'A++'
        });
      }
    } catch (err) {
      console.error('Failed to load institution:', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.analytics.getAuditLogs(40);
      setAuditLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    try {
      await api.institution.update(formData);
      alert('Institution profile configuration updated successfully!');
      loadInstitution();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Institution Settings & Security Audit Trail</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            College profile configuration, regulatory approvals, and immutable system audit logs
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'institution' ? 'active' : ''}`} onClick={() => setActiveTab('institution')}>
          Institution Profile & Branding
        </button>
        <button className={`tab-btn ${activeTab === 'audits' ? 'active' : ''}`} onClick={() => setActiveTab('audits')}>
          System Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: INSTITUTION PROFILE
          ========================================================================= */}
      {activeTab === 'institution' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <form onSubmit={handleSaveInstitution}>
            <div className="form-group">
              <label className="form-label">Institution Legal Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Approved Tagline / Affiliation Summary</label>
              <input
                type="text"
                className="form-input"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Campus Address</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Official Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Official Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Official Portal URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current NAAC Grade</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.naac_grade}
                  onChange={(e) => setFormData({ ...formData, naac_grade: e.target.value })}
                />
              </div>
            </div>

            {['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role) && (
              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} />
                  <span>Save Institution Settings</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SECURITY AUDIT TRAIL
          ========================================================================= */}
      {activeTab === 'audits' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Role</th>
                <th>Action Triggered</th>
                <th>Entity Target</th>
                <th>IP Address</th>
                <th>Audit Details Payload</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.created_at}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {log.user_role}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {log.action}
                    </strong>
                  </td>
                  <td><code>{log.entity_type}</code></td>
                  <td><code style={{ fontSize: '0.75rem' }}>{log.ip_address}</code></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
