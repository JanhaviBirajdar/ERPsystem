import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, AlertCircle, Inbox, Loader2 } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  error = null,
  emptyMessage = 'No records found matching criteria.',
  searchable = true,
  searchPlaceholder = 'Filter records...',
  pageSize = 8,
  actions = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter rows based on search term across all string/number fields
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="datatable-container" style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: 'var(--card-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.05))' }}>
      {/* Top Toolbar */}
      {(searchable || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', gap: '12px', flexWrap: 'wrap' }}>
          {searchable ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--input-bg, #f8fafc)', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', padding: '6px 12px', minWidth: '260px' }}>
              <Search size={16} color="var(--text-muted, #94a3b8)" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}
              />
            </div>
          ) : <div />}

          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{actions}</div>}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748b)' }}>
          <Loader2 size={32} className="spin-animation" style={{ color: 'var(--primary, #2563eb)', marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading records from server...</div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', textAlign: 'center' }}>
          <AlertCircle size={36} style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>Unable to load data</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', maxWidth: '400px' }}>{error}</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && paginatedData.length === 0 && (
        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)', textAlign: 'center' }}>
          <Inbox size={42} style={{ strokeWidth: 1.5, marginBottom: '10px', opacity: 0.6 }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary, #475569)' }}>{emptyMessage}</div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--primary, #2563eb)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear search filter
            </button>
          )}
        </div>
      )}

      {/* Table Data */}
      {!loading && !error && paginatedData.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                {columns.map((col, idx) => (
                  <th
                    key={col.key || idx}
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: 'var(--text-secondary, #475569)',
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em',
                      width: col.width || 'auto',
                      textAlign: col.align || 'left'
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rIdx) => (
                <tr
                  key={row._id || row.id || rIdx}
                  style={{
                    borderBottom: '1px solid var(--border-color, #f1f5f9)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--row-hover-bg, rgba(37,99,235,0.03))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary, #1e293b)',
                        textAlign: col.align || 'left'
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && !error && filteredData.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            Showing <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{((currentPage - 1) * pageSize) + 1}</span> to <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{Math.min(currentPage * pageSize, filteredData.length)}</span> of <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{filteredData.length}</span> entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: currentPage === 1 ? 'var(--btn-disabled-bg, #f1f5f9)' : 'var(--card-bg, #ffffff)',
                color: currentPage === 1 ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary, #0f172a)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={15} /> Prev
            </button>

            <span style={{ padding: '0 8px', fontWeight: 600 }}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: currentPage === totalPages ? 'var(--btn-disabled-bg, #f1f5f9)' : 'var(--card-bg, #ffffff)',
                color: currentPage === totalPages ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary, #0f172a)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
