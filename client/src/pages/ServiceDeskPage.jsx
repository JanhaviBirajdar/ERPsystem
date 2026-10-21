import React, { useState, useEffect } from 'react';
import { LifeBuoy, Plus, CheckCircle2, Clock, AlertCircle, X, Check, ShieldCheck, Printer, QrCode } from 'lucide-react';
import { api } from '../services/api';

export default function ServiceDeskPage({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCertificateTicket, setActiveCertificateTicket] = useState(null);

  const [newTicket, setNewTicket] = useState({
    category: 'BONAFIDE_CERTIFICATE',
    title: '',
    description: '',
    priority: 'NORMAL'
  });

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.serviceDesk.getTickets();
      setTickets(res.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.serviceDesk.createTicket(newTicket);
      alert('Service request ticket logged successfully!');
      setShowCreateModal(false);
      setNewTicket({ category: 'BONAFIDE_CERTIFICATE', title: '', description: '', priority: 'NORMAL' });
      loadTickets();
    } catch (err) {
      alert(`Error submitting ticket: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    const notes = prompt(`Enter resolution remarks for status '${status}':`, `Approved and verified by Academic Office.`);
    if (notes === null) return;

    try {
      const res = await api.serviceDesk.updateStatus(ticketId, {
        status,
        resolution_notes: notes
      });
      alert(`Ticket updated to ${status}!`);
      loadTickets();
    } catch (err) {
      alert(`Error updating ticket: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Digital Student Service Desk & Certificates</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Bonafide certificates, document requests, grievances, and verifiable cryptographic verification seals
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={15} />
          <span>Submit Service Request</span>
        </button>
      </div>

      {/* Tickets Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket No</th>
              <th>Student</th>
              <th>Category</th>
              <th>Request Title & Description</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td><code>{t.ticket_no}</code></td>
                <td>
                  <strong>{t.student_name}</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PRN: {t.prn}</div>
                </td>
                <td><span className="badge badge-info">{t.category?.replace(/_/g, ' ')}</span></td>
                <td>
                  <strong>{t.title}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {t.description}
                  </div>
                  {t.certificate_hash && (
                    <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} />
                      QR Hash: <code>{t.certificate_hash}</code>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${t.priority === 'URGENT' || t.priority === 'HIGH' ? 'badge-danger' : 'badge-neutral'}`}>
                    {t.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge ${t.status === 'APPROVED' ? 'badge-success' : t.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                    {t.status}
                  </span>
                </td>
                <td>{t.created_at?.substring(0, 10)}</td>
                <td style={{ textAlign: 'right' }}>
                  {/* If Approved Bonafide Certificate, allow printing certificate */}
                  {t.status === 'APPROVED' && t.category === 'BONAFIDE_CERTIFICATE' && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '6px' }}
                      onClick={() => setActiveCertificateTicket(t)}
                    >
                      <Printer size={13} />
                      <span>Print Certificate</span>
                    </button>
                  )}

                  {/* Staff Approval Controls */}
                  {['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT'].includes(user?.role) && t.status !== 'APPROVED' && (
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleUpdateStatus(t.id, 'APPROVED')}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUpdateStatus(t.id, 'REJECTED')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Submit Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Service Request</h3>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Request Category *</label>
                  <select
                    className="form-select"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  >
                    <option value="BONAFIDE_CERTIFICATE">Bonafide Certificate Request</option>
                    <option value="LEAVING_CERTIFICATE">Leaving / Transfer Certificate</option>
                    <option value="FEE_RECEIPT_CORRECTION">Fee Receipt / Ledger Correction</option>
                    <option value="EXAM_QUERY">Examination / Revaluation Query</option>
                    <option value="GRIEVANCE">Student Grievance Redressal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject / Purpose *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Bonafide certificate for Passport Application"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Details</label>
                  <textarea
                    rows="3"
                    className="form-textarea"
                    placeholder="Provide details or reference numbers..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal (2-3 working days)</option>
                    <option value="HIGH">High (Within 24 hours)</option>
                    <option value="URGENT">Urgent (Immediate)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE OFFICIAL BONAFIDE CERTIFICATE MODAL
          ========================================================================= */}
      {activeCertificateTicket && (
        <div className="modal-overlay" onClick={() => setActiveCertificateTicket(null)}>
          <div className="modal-content" style={{ maxWidth: '640px', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#0f172a', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Official Digital Bonafide Certificate</span>
              <button className="icon-btn" onClick={() => setActiveCertificateTicket(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                <X size={16} />
              </button>
            </div>

            <div id="printable-bonafide-cert" style={{ padding: '36px', background: '#ffffff', color: '#0f172a' }}>
              {/* College Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Dr. APJ Abdul Kalam Institute of Technology
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Knowledge City Campus, Hinjawadi Infotech Park, Pune - 411057 • NAAC A++ Grade
                </p>
                <div style={{ display: 'inline-block', border: '2px solid #0f172a', padding: '4px 14px', fontSize: '0.85rem', fontWeight: 800, marginTop: '8px' }}>
                  BONAFIDE CERTIFICATE
                </div>
              </div>

              {/* Certificate Body Text */}
              <div style={{ fontSize: '0.9rem', lineHeight: 2, textAlign: 'justify', marginBottom: '32px' }}>
                This is to certify that Mr./Ms. <strong>{activeCertificateTicket.student_name}</strong>, bearing 
                Permanent Registration Number (PRN) <strong>{activeCertificateTicket.prn}</strong> is a bonafide student of this institution, 
                currently studying in <strong>Third Year Engineering (Semester V)</strong> in the Department of <strong>{activeCertificateTicket.department_name || 'Computer Engineering'}</strong> during the Academic Year <strong>2026-2027</strong>.
                <br/><br/>
                To the best of our institutional knowledge and records, he/she bears good moral conduct and character. This certificate is issued upon student's official request for the purpose of <strong>{activeCertificateTicket.title}</strong>.
              </div>

              {/* Verification & Signatures */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '48px', height: '48px', background: '#0f172a', color: 'white', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={36} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> DIGITAL REGISTRAR SEAL
                    </span>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {activeCertificateTicket.certificate_hash}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.78rem' }}>
                  <div style={{ borderTop: '1px solid #0f172a', width: '150px', paddingTop: '4px', fontWeight: 700 }}>
                    Registrar / Principal
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>AIT Pune</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveCertificateTicket(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                <span>Print Official Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
