import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Clock, Sparkles, Check, X, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function AcademicsPage({ user }) {
  const [activeTab, setActiveTab] = useState('timetable');
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('div-comp-5a');
  const [loading, setLoading] = useState(true);

  // Smart Timetable Generator State
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  useEffect(() => {
    loadSubjects();
    loadTimetable();
  }, [selectedDivision]);

  const loadSubjects = async () => {
    try {
      const res = await api.academics.getSubjects({ department_id: 'dept-comp', semester_id: 'sem-5' });
      setSubjects(res.subjects || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await api.academics.getTimetable(selectedDivision);
      setTimetable(res.timetable || []);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSyllabus = async (subjectId, newPct) => {
    try {
      await api.academics.updateSyllabus(subjectId, newPct);
      loadSubjects();
    } catch (err) {
      alert(`Error updating syllabus: ${err.message}`);
    }
  };

  const handleRunTimetableGenerator = async (autoPublish) => {
    setGenerating(true);
    try {
      const res = await api.academics.generateTimetable({
        division_id: selectedDivision,
        auto_publish: autoPublish
      });
      setGenResult(res);
      if (autoPublish) {
        alert('Timetable generated and published to live division schedule!');
        loadTimetable();
      }
    } catch (err) {
      alert(`Generator failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const SLOTS = [
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:15 - 12:15',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:15 - 16:15'
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Curriculum & Academic Timetables</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Weekly schedules, syllabus completion tracker, and constraint-based automated timetable solver
          </p>
        </div>

        {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
          <button 
            className="btn btn-primary"
            onClick={() => { setShowGenModal(true); setGenResult(null); }}
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none' }}
          >
            <Sparkles size={16} />
            <span>Smart Timetable Generator</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          Weekly Timetable Grid
        </button>
        <button 
          className={`tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          Curriculum & Syllabus Completion Tracker
        </button>
      </div>

      {/* =========================================================================
          TAB 1: TIMETABLE GRID
          ========================================================================= */}
      {activeTab === 'timetable' && (
        <div>
          {/* Division Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active Class Schedule:</span>
              <select 
                className="form-select" 
                style={{ width: 'auto', minWidth: '220px' }}
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
              >
                <option value="div-comp-5a">Computer Engg - Third Year Div A (LH-302)</option>
                <option value="div-comp-5b">Computer Engg - Third Year Div B (LH-304)</option>
                <option value="div-aids-5a">AI & Data Science - Third Year Div A (LH-201)</option>
                <option value="div-entc-5a">E&TC - Third Year Div A (LH-105)</option>
              </select>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total Scheduled Slots: <strong>{timetable.length}</strong>
            </span>
          </div>

          {/* Timetable Table Grid */}
          <div className="table-container">
            <table className="data-table" style={{ textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Day / Time</th>
                  {SLOTS.map(s => (
                    <th key={s} style={{ textAlign: 'center' }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td style={{ fontWeight: 700, backgroundColor: 'var(--bg-muted)' }}>
                      {day}
                    </td>
                    {SLOTS.map(slot => {
                      const entry = timetable.find(t => t.day_of_week === day && t.time_slot === slot);
                      return (
                        <td key={slot} style={{ minWidth: '150px', padding: '10px 8px' }}>
                          {entry ? (
                            <div style={{ 
                              background: 'var(--primary-subtle)', 
                              border: '1px solid var(--primary-border)',
                              borderRadius: '8px', 
                              padding: '8px',
                              textAlign: 'left'
                            }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {entry.subject_code}
                              </div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px', lineHeight: 1.2 }}>
                                {entry.subject_name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                👨‍🏫 {entry.faculty_name?.split(' ')[0] || 'Staff'} • {entry.room_or_lab}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CURRICULUM & SYLLABUS COMPLETION
          ========================================================================= */}
      {activeTab === 'curriculum' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {subjects.map(sub => (
            <div key={sub.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-info">{sub.code}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Credits: <strong>{sub.credits}</strong> ({sub.theory_hours}L + {sub.practical_hours}P)
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{sub.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {sub.syllabus_modules} Modules • Aligned with NEP 2020 Curricular Framework
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span>Syllabus Completion</span>
                  <strong>{sub.syllabus_completed_pct}%</strong>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill blue" 
                    style={{ width: `${sub.syllabus_completed_pct}%` }} 
                  />
                </div>
              </div>

              {/* Quick Update Buttons */}
              {['SUPER_ADMIN', 'HOD', 'FACULTY'].includes(user?.role) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleUpdateSyllabus(sub.id, Math.min(100, sub.syllabus_completed_pct + 10))}
                  >
                    +10%
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleUpdateSyllabus(sub.id, 100)}
                  >
                    Mark 100%
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          SMART TIMETABLE GENERATOR MODAL
          ========================================================================= */}
      {showGenModal && (
        <div className="modal-overlay" onClick={() => setShowGenModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Smart Constraint-Based Timetable Generator</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Solves faculty conflicts, room allocation limits, and weekly workload
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowGenModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'var(--bg-muted)', padding: '14px', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                <strong>Algorithm Constraints Enforced:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', lineHeight: 1.6 }}>
                  <li>Zero faculty double-booking across concurrent divisions</li>
                  <li>Maximum 2 lectures per subject per day to prevent student cognitive fatigue</li>
                  <li>Lunch break (12:15 - 13:00) preserved across institutional timetables</li>
                  <li>Classroom & computer laboratory capacity limits respected</li>
                </ul>
              </div>

              {genResult && (
                <div style={{ background: genResult.unsatisfiedConstraints === 0 ? '#ecfdf5' : '#fffbeb', border: '1px solid ' + (genResult.unsatisfiedConstraints === 0 ? '#a7f3d0' : '#fde68a'), borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: genResult.unsatisfiedConstraints === 0 ? '#059669' : '#d97706' }}>
                    <CheckCircle2 size={18} />
                    <span>Schedule Optimization Completed: {genResult.slotsGenerated} / {genResult.totalSlotsPlanned} slots allocated</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Unsatisfied constraints: <strong>{genResult.unsatisfiedConstraints}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGenModal(false)}>
                Close
              </button>
              <button 
                className="btn btn-secondary"
                disabled={generating}
                onClick={() => handleRunTimetableGenerator(false)}
              >
                Dry Run Simulation
              </button>
              <button 
                className="btn btn-primary"
                disabled={generating}
                onClick={() => handleRunTimetableGenerator(true)}
              >
                <Sparkles size={16} />
                <span>Publish Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
