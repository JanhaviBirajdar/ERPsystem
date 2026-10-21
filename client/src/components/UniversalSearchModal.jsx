import React, { useState, useEffect } from 'react';
import { Search, X, Users, GraduationCap, BookOpen, Bell, LifeBuoy, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function UniversalSearchModal({ isOpen, onClose, onSelectResult }) {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ students: [], faculty: [], subjects: [], notices: [], tickets: [] });

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ students: [], faculty: [], subjects: [], notices: [], tickets: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search.query(query);
        setResults(res.results || { students: [], faculty: [], subjects: [], notices: [], tickets: [] });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const hasAnyResults = results.students.length > 0 || 
                        results.faculty.length > 0 || 
                        results.subjects.length > 0 || 
                        results.notices.length > 0 || 
                        results.tickets.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <Search size={20} color="var(--primary)" />
          <input
            type="text"
            className="form-input"
            autoFocus
            placeholder="Type student name, PRN, faculty, subject or circular..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', boxShadow: 'none', fontSize: '1rem', padding: 0 }}
          />
          {loading && <Loader2 size={18} className="spin" color="var(--primary)" />}
          <button className="icon-btn" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>
            <X size={18} />
          </button>
        </div>

        {/* Results Area */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px' }}>
          {!query.trim() && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Search across students, faculty members, subjects, notices, and service tickets.
            </div>
          )}

          {query.trim().length >= 2 && !loading && !hasAnyResults && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No matching institutional records found for "{query}".
            </div>
          )}

          {/* Students */}
          {results.students.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 10px' }}>
                Students ({results.students.length})
              </div>
              {results.students.map(st => (
                <div
                  key={st.id}
                  onClick={() => { onSelectResult('students', st.id); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <Users size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{st.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRN: {st.subtitle} • Roll: {st.roll_no} • {st.department_code}</div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}

          {/* Faculty */}
          {results.faculty.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 10px' }}>
                Faculty Members ({results.faculty.length})
              </div>
              {results.faculty.map(f => (
                <div
                  key={f.id}
                  onClick={() => { onSelectResult('faculty', f.id); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                      <GraduationCap size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{f.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.subtitle} • {f.department_code} • {f.emp_code}</div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}

          {/* Courses / Subjects */}
          {results.subjects.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 10px' }}>
                Curriculum Subjects ({results.subjects.length})
              </div>
              {results.subjects.map(sub => (
                <div
                  key={sub.id}
                  onClick={() => { onSelectResult('academics', sub.id); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <BookOpen size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{sub.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {sub.subtitle} • Credits: {sub.credits} • {sub.department_code}</div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
