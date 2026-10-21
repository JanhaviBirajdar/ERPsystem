import React from 'react';
import { X, Printer, ShieldCheck, QrCode, CheckCircle2 } from 'lucide-react';

export default function DigitalIdCardModal({ isOpen, onClose, student, institution }) {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const verificationHash = `AIT-ID-2026-${student.prn}-VERIFIED`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '440px', padding: 0, overflow: 'hidden', background: '#ffffff', borderRadius: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#0f172a', color: 'white' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#60a5fa" />
            Official Digital Campus Identity
          </span>
          <button className="icon-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white' }}>
            <X size={16} />
          </button>
        </div>

        {/* Printable Card Area */}
        <div id="printable-id-card" style={{ padding: '24px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
          {/* College Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', lineHeight: 1.2 }}>
              {institution?.name || 'Dr. APJ Abdul Kalam Institute of Technology'}
            </h3>
            <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
              Autonomous Institute • Approved by AICTE • NAAC A++ Grade
            </p>
            <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', marginTop: '4px' }}>
              STUDENT IDENTITY CARD • AY 2026-2027
            </div>
          </div>

          {/* Student Profile Row */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            <img 
              src={student.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'} 
              alt={student.full_name} 
              style={{ width: '84px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #2563eb', boxShadow: 'var(--shadow-sm)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{student.full_name}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>
                PRN: {student.prn}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                Roll No: <strong>{student.roll_no}</strong> • Div: {student.division_name || 'Div A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {student.department_name || 'Computer Engineering'}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', marginBottom: '16px' }}>
            <div>
              <span style={{ color: '#64748b' }}>Category:</span> <strong>{student.category}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Blood Group:</span> <strong>{student.blood_group || 'B+'}</strong>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b' }}>Academic Bank of Credits:</span><br/>
              <code style={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 600 }}>{student.abc_id || 'ABC-8921-4451-9012'}</code>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b' }}>Emergency Contact:</span> <strong>{student.guardian_phone || '+91 98221 11223'}</strong>
            </div>
          </div>

          {/* QR Code Verification Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                DIGITALLY VERIFIED
              </span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                {verificationHash}
              </span>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <QrCode size={36} />
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="modal-footer" style={{ padding: '12px 16px', background: '#f8fafc' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={15} />
            <span>Print Official ID Card</span>
          </button>
        </div>
      </div>
    </div>
  );
}
