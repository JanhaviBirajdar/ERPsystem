import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export function FormField({ label, required = false, error = null, hint = null, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: error ? '#ef4444' : 'var(--text-secondary, #475569)'
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '0.78rem' }}>
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
      {!error && hint && (
        <div style={{ marginTop: '4px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.78rem' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function AlertBanner({ type = 'info', message, onClose }) {
  if (!message) return null;

  const styles = {
    info: { bg: 'rgba(37, 99, 235, 0.08)', border: '#3b82f6', text: '#1d4ed8', icon: Info },
    success: { bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981', text: '#047857', icon: CheckCircle2 },
    error: { bg: 'rgba(239, 68, 68, 0.08)', border: '#ef4444', text: '#b91c1c', icon: AlertCircle }
  }[type] || { bg: 'rgba(37, 99, 235, 0.08)', border: '#3b82f6', text: '#1d4ed8', icon: Info };

  const Icon = styles.icon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '10px',
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        fontSize: '0.875rem',
        marginBottom: '16px'
      }}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 500 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, padding: '0 4px' }}
        >
          ×
        </button>
      )}
    </div>
  );
}
