import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Download, Printer, CheckCircle2, Plus, X, Search, Check } from 'lucide-react';
import { api } from '../services/api';

export default function FinancePage({ user }) {
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [structures, setStructures] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('ONLINE_UPI');

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);

  useEffect(() => {
    loadInvoices();
    loadStructures();
    if (['SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(user?.role)) {
      loadSummary();
    }
  }, [user]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.finance.getInvoices();
      setInvoices(res.invoices || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStructures = async () => {
    try {
      const res = await api.finance.getStructures();
      setStructures(res.structures || []);
    } catch (err) {
      console.error('Failed to load fee structures:', err);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.finance.getSummary();
      setSummary(res);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const handleOpenPayModal = (inv) => {
    setActiveInvoice(inv);
    setPaymentAmount(inv.balance_amount.toString());
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!activeInvoice) return;
    try {
      const res = await api.finance.recordPayment({
        invoice_id: activeInvoice.id,
        amount: parseFloat(paymentAmount),
        payment_mode: paymentMode
      });
      alert(`Payment of ₹${paymentAmount} recorded successfully! Receipt: ${res.payment.receipt_number}`);
      setShowPayModal(false);
      loadInvoices();
      if (['SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(user?.role)) {
        loadSummary();
      }
      // Open receipt immediately
      handleViewReceipt(res.payment.id);
    } catch (err) {
      alert(`Payment failed: ${err.message}`);
    }
  };

  const handleViewReceipt = async (paymentIdOrReceiptNo) => {
    try {
      const res = await api.finance.getReceipt(paymentIdOrReceiptNo);
      setActiveReceipt(res.receipt);
    } catch (err) {
      alert(`Error fetching receipt: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Fees & Financial Ledger</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Quota-wise fee structures, student ledger invoices, atomic payment reconciliation, and formal receipts
          </p>
        </div>
      </div>

      {/* Summary KPI Cards for Accountant & Management */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Billed Fees</span>
              <span className="stat-value">₹{summary.summary?.total_billed?.toLocaleString('en-IN')}</span>
              <span className="stat-trend neutral">AY 2026-2027 Total Demand</span>
            </div>
            <div className="stat-icon blue"><CreditCard size={22} /></div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Fee Collection</span>
              <span className="stat-value" style={{ color: '#059669' }}>
                ₹{summary.summary?.total_collected?.toLocaleString('en-IN')}
              </span>
              <span className="stat-trend positive">Realized in Institutional Account</span>
            </div>
            <div className="stat-icon green"><CheckCircle2 size={22} /></div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Outstanding Dues</span>
              <span className="stat-value" style={{ color: '#dc2626' }}>
                ₹{summary.summary?.total_outstanding?.toLocaleString('en-IN')}
              </span>
              <span className="stat-trend negative">Pending Student Accounts</span>
            </div>
            <div className="stat-icon rose"><DollarSign size={22} /></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
          Student Fee Invoices
        </button>
        <button className={`tab-btn ${activeTab === 'structures' ? 'active' : ''}`} onClick={() => setActiveTab('structures')}>
          Approved Annual Fee Structures (By Quota)
        </button>
      </div>

      {/* =========================================================================
          TAB 1: STUDENT INVOICES
          ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Student Details</th>
                <th>PRN</th>
                <th>Category</th>
                <th>Total Billed</th>
                <th>Amount Paid</th>
                <th>Outstanding Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><code>{inv.invoice_number}</code></td>
                  <td>
                    <strong>{inv.student_name}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Roll: {inv.roll_no} • {inv.department_code}</div>
                  </td>
                  <td><code>{inv.prn}</code></td>
                  <td><span className="badge badge-neutral">{inv.category}</span></td>
                  <td>₹{inv.total_amount?.toLocaleString('en-IN')}</td>
                  <td>₹{inv.paid_amount?.toLocaleString('en-IN')}</td>
                  <td>
                    <strong style={{ color: inv.balance_amount > 0 ? '#dc2626' : '#059669' }}>
                      ₹{inv.balance_amount?.toLocaleString('en-IN')}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge ${inv.status === 'PAID' ? 'badge-success' : inv.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {inv.balance_amount > 0 ? (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenPayModal(inv)}
                      >
                        Pay / Settle
                      </button>
                    ) : (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewReceipt(`REC-2026-${inv.prn.slice(-4)}`)}
                      >
                        <Printer size={13} />
                        <span>Receipt</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          TAB 2: APPROVED FEE STRUCTURES
          ========================================================================= */}
      {activeTab === 'structures' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Fee Category / Quota</th>
                <th>Tuition Fee</th>
                <th>Development Fee</th>
                <th>Exam & Gymkhana</th>
                <th>Total Annual Fee</th>
              </tr>
            </thead>
            <tbody>
              {structures.map(fs => (
                <tr key={fs.id}>
                  <td><strong>{fs.department_name}</strong> ({fs.department_code})</td>
                  <td><span className="badge badge-info">{fs.category_name}</span></td>
                  <td>₹{fs.tuition_fee?.toLocaleString('en-IN')}</td>
                  <td>₹{fs.development_fee?.toLocaleString('en-IN')}</td>
                  <td>₹{(fs.exam_fee + fs.gymkhana_library_fee)?.toLocaleString('en-IN')}</td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                      ₹{fs.total_annual_fee?.toLocaleString('en-IN')}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          RECORD FEE PAYMENT MODAL
          ========================================================================= */}
      {showPayModal && activeInvoice && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Fee Payment</h3>
              <button className="icon-btn" onClick={() => setShowPayModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                  <div><strong>Student:</strong> {activeInvoice.student_name} (PRN: {activeInvoice.prn})</div>
                  <div><strong>Invoice:</strong> {activeInvoice.invoice_number}</div>
                  <div><strong>Outstanding Balance:</strong> <strong style={{ color: '#dc2626' }}>₹{activeInvoice.balance_amount.toLocaleString('en-IN')}</strong></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={activeInvoice.balance_amount}
                    className="form-input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Gateway / Mode *</label>
                  <select
                    className="form-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="ONLINE_UPI">Online UPI (PhonePe / Google Pay / BHIM)</option>
                    <option value="NET_BANKING">Internet Banking (NEFT / RTGS)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CHALLAN">Bank Counter Challan</option>
                    <option value="DEMAND_DRAFT">Demand Draft (DD)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>Confirm & Issue Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE OFFICIAL FEE RECEIPT MODAL
          ========================================================================= */}
      {activeReceipt && (
        <div className="modal-overlay" onClick={() => setActiveReceipt(null)}>
          <div className="modal-content" style={{ maxWidth: '620px', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#0f172a', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Official Institutional Fee Receipt</span>
              <button className="icon-btn" onClick={() => setActiveReceipt(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                <X size={16} />
              </button>
            </div>

            <div id="printable-fee-receipt" style={{ padding: '28px', background: '#ffffff', color: '#0f172a' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Dr. APJ Abdul Kalam Institute of Technology
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Knowledge City Campus, Hinjawadi Infotech Park, Pune - 411057 • NAAC A++ Grade
                </p>
                <div style={{ display: 'inline-block', border: '1px solid #0f172a', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700, marginTop: '6px' }}>
                  ACCOUNTS SECTION • OFFICIAL FEE RECEIPT
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div><strong>Receipt No:</strong> <code>{activeReceipt.receipt_number}</code></div>
                <div><strong>Date:</strong> {activeReceipt.payment_date?.substring(0, 10)}</div>
                <div><strong>Student Name:</strong> {activeReceipt.student_name}</div>
                <div><strong>PRN:</strong> <code>{activeReceipt.prn}</code></div>
                <div><strong>Roll No:</strong> {activeReceipt.roll_no}</div>
                <div><strong>Quota:</strong> {activeReceipt.category}</div>
                <div><strong>Payment Mode:</strong> {activeReceipt.payment_mode}</div>
                <div><strong>Bank Ref / Txn ID:</strong> <code>{activeReceipt.transaction_ref}</code></div>
              </div>

              <div style={{ border: '2px solid #059669', padding: '14px', borderRadius: '8px', background: '#ecfdf5', textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#047857', fontWeight: 700 }}>
                  Amount Received in Words:
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                  ₹{activeReceipt.amount?.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '2px' }}>
                  Status: <strong>PAID IN FULL / AUTHORIZED BY TREASURY</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '28px', fontSize: '0.75rem', color: '#475569' }}>
                <div>Received By: <strong>{activeReceipt.received_by || 'Treasury Section'}</strong></div>
                <div>Authorized Signatory (Finance Officer)</div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveReceipt(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                <span>Print Fee Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
