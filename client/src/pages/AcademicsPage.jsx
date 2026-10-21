import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Clock, Sparkles, Check, X, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function AcademicsPage({ user }) {
  const [activeTab, setActiveTab] = useState('timetable');
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('div-comp-5a');
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState([]);

  // Smart Timetable Generator State
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  // Manual Slot Scheduling & Conflict Detection State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [conflictCheck, setConflictCheck] = useState(null);
  const [slotForm, setSlotForm] = useState({
    division_id: 'div-comp-5a',
    day_of_week: 'Monday',
    time_slot: '09:00 - 10:00',
    subject_id: 'sub-cs501',
    faculty_id: 'fac-101',
    room_or_lab: 'Lecture Hall 302'
  });

  useEffect(() => {
    loadSubjects();
    loadTimetable();
    loadFaculty();
  }, [selectedDivision]);

  const loadFaculty = async () => {
    try {
      const res = await api.faculty.getAll();
      setFacultyList(res.faculty || []);
    } catch (e) {
      console.error(e);
    }
  };


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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowSlotModal(true); setConflictCheck(null); }}
            >
              <Calendar size={15} /> Schedule Slot
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => { setShowGenModal(true); setGenResult(null); }}
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none' }}
            >
              <Sparkles size={16} />
              <span>Smart Timetable Generator</span>
            </button>
          </div>
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
        <button 
          className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          Classroom & Lab Allocations
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
          TAB 3: CLASSROOM & LAB ALLOCATIONS
          ========================================================================= */}
      {activeTab === 'rooms' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>
            Campus Academic Infrastructure: Classrooms & Computer Labs
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Facility / Room</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Capacity</th>
                  <th style={{ padding: '10px 14px' }}>Assigned Division</th>
                  <th style={{ padding: '10px 14px' }}>Smart Equipment</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Lecture Hall 302', type: 'Lecture Classroom', cap: 75, div: 'TE COMP Div A', equip: '4K Interactive Projector, Mic System' },
                  { name: 'Lecture Hall 304', type: 'Lecture Classroom', cap: 75, div: 'TE COMP Div B', equip: 'Laser Projector, Smart Board' },
                  { name: 'Lecture Hall 201', type: 'Lecture Classroom', cap: 70, div: 'TE AIDS Div A', equip: 'Digital Smart Podium' },
                  { name: 'Lecture Hall 105', type: 'Lecture Classroom', cap: 70, div: 'TE ENTC Div A', equip: 'AV Surround Sound' },
                  { name: 'Advanced AI & Cloud Lab', type: 'Computer Laboratory', cap: 40, div: 'COMP / AIDS Batches', equip: '40x Core i7 32GB RAM Terminals' },
                  { name: 'Database & Networking Lab', type: 'Computer Laboratory', cap: 40, div: 'COMP / IT Batches', equip: 'Gigabit Switch, Server Rack' },
                  { name: 'Embedded IoT Systems Lab', type: 'Electronics Laboratory', cap: 35, div: 'ENTC Batches', equip: 'Tektronix Oscilloscopes, FPGA Kits' }
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary)' }}>{r.name}</td>
                    <td style={{ padding: '12px 14px' }}><span className="badge badge-secondary">{r.type}</span></td>
                    <td style={{ padding: '12px 14px' }}>{r.cap} Seats</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.div}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.equip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANUAL SLOT SCHEDULING & CONFLICT DETECTION MODAL
          ========================================================================= */}
      {showSlotModal && (
        <div className="modal-overlay" onClick={() => setShowSlotModal(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Schedule Lecture / Lab Slot</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Select schedule coordinates. System will automatically check for faculty and room conflicts.
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowSlotModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Day of Week</label>
                  <select
                    className="form-input"
                    value={slotForm.day_of_week}
                    onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Time Slot</label>
                  <select
                    className="form-input"
                    value={slotForm.time_slot}
                    onChange={(e) => setSlotForm({ ...slotForm, time_slot: e.target.value })}
                  >
                    {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Course Subject</label>
                <select
                  className="form-input"
                  value={slotForm.subject_id}
                  onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })}
                >
                  <option value="sub-cs501">CS501 - Database Management Systems</option>
                  <option value="sub-cs502">CS502 - Advanced Computer Networks</option>
                  <option value="sub-cs503">CS503 - Theory of Computation</option>
                  <option value="sub-it501">IT501 - Cloud Computing & DevOps</option>
                  <option value="sub-ec501">EC501 - Microcontrollers & Embedded Systems</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Faculty Member</label>
                  <select
                    className="form-input"
                    value={slotForm.faculty_id}
                    onChange={(e) => setSlotForm({ ...slotForm, faculty_id: e.target.value })}
                  >
                    {facultyList.map(f => (
                      <option key={f.id} value={f.id}>{f.full_name} ({f.emp_code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Classroom / Lab</label>
                  <select
                    className="form-input"
                    value={slotForm.room_or_lab}
                    onChange={(e) => setSlotForm({ ...slotForm, room_or_lab: e.target.value })}
                  >
                    <option value="Lecture Hall 302">Lecture Hall 302</option>
                    <option value="Lecture Hall 304">Lecture Hall 304</option>
                    <option value="Advanced AI & Cloud Lab">Advanced AI & Cloud Lab</option>
                    <option value="Database & Networking Lab">Database & Networking Lab</option>
                    <option value="Embedded IoT Systems Lab">Embedded IoT Systems Lab</option>
                  </select>
                </div>
              </div>

              {conflictCheck && conflictCheck.hasConflict && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginTop: '12px', color: '#b91c1c', fontSize: '0.82rem' }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  {conflictCheck.facultyConflict ? `Faculty Conflict: Assigned to ${conflictCheck.facultyConflict.division_name}` : `Room Conflict: Occupied by ${conflictCheck.roomConflict.division_name}`}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSlotModal(false)}>Cancel</button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  const res = await api.academics.checkConflicts({
                    faculty_id: slotForm.faculty_id,
                    room_or_lab: slotForm.room_or_lab,
                    day_of_week: slotForm.day_of_week,
                    time_slot: slotForm.time_slot,
                    division_id: selectedDivision
                  });
                  setConflictCheck(res);
                  if (!res.hasConflict) alert('No conflicts detected! Faculty and room are available.');
                }}
              >
                Pre-Flight Conflict Check
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await api.academics.scheduleSlot({
                      ...slotForm,
                      division_id: selectedDivision
                    });
                    alert('Lecture slot scheduled successfully!');
                    setShowSlotModal(false);
                    loadTimetable();
                  } catch (err) {
                    alert(`Scheduling conflict: ${err.message}`);
                  }
                }}
              >
                <Check size={16} /> Save Lecture Slot
              </button>
            </div>
          </div>
        </div>
      )}

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
