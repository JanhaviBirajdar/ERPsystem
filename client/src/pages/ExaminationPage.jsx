import React, { useState, useEffect } from 'react';
import { 
  Award, Lock, Unlock, Printer, Eye, Check, X, ShieldCheck, Download, 
  Calendar, Clock, RefreshCw, AlertCircle, FileText, Send, CheckCircle2, 
  XCircle, Filter, Plus, ChevronRight, UserCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function ExaminationPage({ user }) {
  const [activeTab, setActiveTab] = useState('marks-entry');
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('exam-cie1');
  const [selectedSubject, setSelectedSubject] = useState('sub-cs501');
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Schedules state
  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    examination_id: 'exam-cie1',
    subject_id: 'sub-cs501',
    exam_date: '2026-11-15',
    start_time: '10:00',
    end_time: '12:00',
    room_or_hall: 'LH-101'
  });

  // Revaluation state
  const [revaluations, setRevaluations] = useState([]);
  const [selectedReval, setSelectedReval] = useState(null);
  const [revalReviewForm, setRevalReviewForm] = useState({
    status: 'ACCEPTED',
    revised_marks: '',
    evaluator_remarks: ''
  });
  const [showNewRevalModal, setShowNewRevalModal] = useState(false);
  const [newRevalForm, setNewRevalForm] = useState({
    marks_entry_id: '',
    reason: ''
  });

  // Marksheet Modal State
  const [selectedStudentMarksheet, setSelectedStudentMarksheet] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (activeTab === 'marks-entry') {
      loadMarks();
    } else if (activeTab === 'schedules') {
      loadSchedules();
    } else if (activeTab === 'revaluation') {
      loadRevaluations();
    }
  }, [activeTab, selectedExam, selectedSubject]);

  const loadExams = async () => {
    try {
      const res = await api.examination.getExams();
      setExams(res.exams || []);
    } catch (err) {
      console.error('Failed to load exams:', err);
    }
  };

  const loadMarks = async () => {
    setLoading(true);
    try {
      const res = await api.examination.getMarks({
        examination_id: selectedExam,
        subject_id: selectedSubject,
        division_id: 'div-comp-5a'
      });
      setMarks(res.marks || []);
    } catch (err) {
      console.error('Failed to load marks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.examination.getSchedules();
      setSchedules(res.schedules || []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRevaluations = async () => {
    setLoading(true);
    try {
      const res = await api.examination.getRevaluations();
      setRevaluations(res.requests || []);
    } catch (err) {
      console.error('Failed to load revaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, val) => {
    setMarks(prev => prev.map(m => m.student_id === studentId ? { ...m, marks_obtained: val } : m));
  };

  const handleSaveMarks = async () => {
    try {
      await api.examination.submitMarks({
        examination_id: selectedExam,
        subject_id: selectedSubject,
        entries: marks.map(m => ({ student_id: m.student_id, marks_obtained: m.marks_obtained }))
      });
      alert('Examination marks saved and grades calculated!');
      loadMarks();
    } catch (err) {
      alert(`Failed to save marks: ${err.message}`);
    }
  };

  const handleLockMarks = async () => {
    if (!confirm('Are you sure you want to lock these marks? Locked marks cannot be altered without Super Admin authorization.')) return;
    try {
      await api.examination.lockMarks({ examination_id: selectedExam, subject_id: selectedSubject });
      alert('Marks successfully locked!');
      loadMarks();
    } catch (err) {
      alert(`Error locking marks: ${err.message}`);
    }
  };

  const handlePublishResults = async (examId, examName) => {
    if (!confirm(`Are you sure you want to officially publish results for "${examName}"? All marks entries will be locked and student grade cards released.`)) return;
    try {
      const res = await api.examination.publishResults(examId);
      alert(res.message || 'Results published successfully!');
      loadExams();
      loadMarks();
    } catch (err) {
      alert(`Error publishing results: ${err.message}`);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.examination.scheduleExam(scheduleForm);
      alert('Exam timetable slot scheduled successfully!');
      setShowScheduleModal(false);
      loadSchedules();
    } catch (err) {
      alert(`Error scheduling exam: ${err.message}`);
    }
  };

  const handleReviewRevaluation = async (e) => {
    e.preventDefault();
    if (!selectedReval) return;
    try {
      await api.examination.reviewRevaluation(selectedReval.id, revalReviewForm);
      alert(`Revaluation request ${revalReviewForm.status.toLowerCase()} and grades updated.`);
      setSelectedReval(null);
      loadRevaluations();
    } catch (err) {
      alert(`Error reviewing request: ${err.message}`);
    }
  };

  const handleSubmitRevaluationRequest = async (e) => {
    e.preventDefault();
    try {
      await api.examination.submitRevaluation(newRevalForm);
      alert('Revaluation request submitted to the Controller of Examinations!');
      setShowNewRevalModal(false);
      setNewRevalForm({ marks_entry_id: '', reason: '' });
      loadRevaluations();
    } catch (err) {
      alert(`Failed to submit request: ${err.message}`);
    }
  };

  const handleOpenMarksheet = async (studentId) => {
    try {
      const res = await api.examination.getMarksheet(studentId);
      setSelectedStudentMarksheet(res);
    } catch (err) {
      alert(`Error generating marksheet: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="text-primary" size={24} />
            Examination & Autonomous Grade Engine
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Exam timetables, continuous internal evaluation (CIE), locked grade point calculations, result publishing, and revaluation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {activeTab === 'marks-entry' && ['SUPER_ADMIN', 'HOD', 'PRINCIPAL'].includes(user?.role) && (
            <button className="btn btn-secondary btn-sm" onClick={handleLockMarks}>
              <Lock size={14} />
              <span>Lock Subject Marks</span>
            </button>
          )}

          {activeTab === 'schedules' && ['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowScheduleModal(true)}>
              <Plus size={14} />
              <span>Schedule Exam Slot</span>
            </button>
          )}

          {activeTab === 'revaluation' && ['STUDENT', 'SUPER_ADMIN'].includes(user?.role) && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewRevalModal(true)}>
              <Send size={14} />
              <span>Request Revaluation</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button
          className={`tab-btn ${activeTab === 'marks-entry' ? 'active' : ''}`}
          onClick={() => setActiveTab('marks-entry')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'marks-entry' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'marks-entry' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Marks Entry & Grading
        </button>
        <button
          className={`tab-btn ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'schedules' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'schedules' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Exam Timetable Schedules ({schedules.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'results' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'results' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Result Publication
        </button>
        <button
          className={`tab-btn ${activeTab === 'revaluation' ? 'active' : ''}`}
          onClick={() => setActiveTab('revaluation')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'revaluation' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'revaluation' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Revaluation Requests ({revaluations.length})
        </button>
      </div>

      {/* TAB 1: MARKS ENTRY & GRADING */}
      {activeTab === 'marks-entry' && (
        <>
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Examination:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '220px' }}
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                >
                  <option value="exam-cie1">CIE Unit Test 1 (Max 30)</option>
                  <option value="exam-cie2">CIE Unit Test 2 (Max 30)</option>
                  <option value="exam-insem">In-Sem Examination (Max 50)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subject:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '240px' }}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="sub-cs501">CS501: Database Management Systems</option>
                  <option value="sub-cs502">CS502: Theory of Computation</option>
                  <option value="sub-cs503">CS503: Computer Networks</option>
                </select>
              </div>

              {['SUPER_ADMIN', 'HOD', 'FACULTY'].includes(user?.role) && (
                <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={handleSaveMarks}>
                  <Check size={14} />
                  <span>Save & Calculate Grades</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>PRN</th>
                  <th>Marks Obtained (Max: 30)</th>
                  <th>Grade Letter</th>
                  <th>Grade Point</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Official Marksheet</th>
                </tr>
              </thead>
              <tbody>
                {marks.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.roll_no}</strong></td>
                    <td><strong>{m.student_name}</strong></td>
                    <td><code>{m.prn}</code></td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        className="form-input"
                        style={{ width: '90px', padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}
                        value={m.marks_obtained}
                        disabled={m.is_locked || !['SUPER_ADMIN', 'HOD', 'FACULTY'].includes(user?.role)}
                        onChange={(e) => handleMarkChange(m.student_id, e.target.value)}
                      />
                    </td>
                    <td>
                      <span className={`badge ${m.grade_letter === 'F' ? 'badge-danger' : 'badge-info'}`} style={{ fontWeight: 700 }}>
                        {m.grade_letter}
                      </span>
                    </td>
                    <td><strong>{m.grade_point}</strong> / 10.0</td>
                    <td>
                      {m.is_locked ? (
                        <span style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Locked
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Draft</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenMarksheet(m.student_id)}
                        title="Generate Semester Marksheet"
                      >
                        <Eye size={14} />
                        <span>View Marksheet</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: EXAM TIMETABLE SCHEDULES */}
      {activeTab === 'schedules' && (
        <div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Window</th>
                  <th>Exam Name</th>
                  <th>Course Code & Title</th>
                  <th>Credits</th>
                  <th>Hall / Classroom</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sc, idx) => (
                  <tr key={sc.id || idx}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} className="text-primary" />
                        <strong>{sc.exam_date}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        <span>{sc.start_time} - {sc.end_time}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{sc.exam_name || 'Unit Test'}</span>
                    </td>
                    <td>
                      <strong>{sc.subject_code}</strong>: {sc.subject_name}
                    </td>
                    <td>{sc.credits} Credits</td>
                    <td>
                      <span className="badge badge-secondary">{sc.room_or_hall || 'LH-101'}</span>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No examination schedules registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RESULT PUBLICATION */}
      {activeTab === 'results' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {exams.map(ex => (
            <div key={ex.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px 0' }}>{ex.name}</h3>
                  <span className="badge badge-info">{ex.type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Academic Year</span>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ex.academic_year_name || '2026-2027'}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <strong>{ex.exam_date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Max Marks:</span>
                  <strong>{ex.max_marks}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Passing Threshold:</span>
                  <strong>{ex.passing_marks} marks (40%)</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <ShieldCheck size={16} /> Autonomous Standard
                </span>

                {['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role) && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handlePublishResults(ex.id, ex.name)}
                  >
                    <Award size={14} />
                    <span>Publish Results & Lock</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: REVALUATION REQUESTS */}
      {activeTab === 'revaluation' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Student</th>
                <th>Course / Exam</th>
                <th>Original Marks</th>
                <th>Revised Marks</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {revaluations.map(r => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>
                    <strong>{r.student_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {r.roll_no} | PRN: {r.prn}</div>
                  </td>
                  <td>
                    <div><strong>{r.subject_code}</strong>: {r.subject_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.exam_name}</div>
                  </td>
                  <td><strong style={{ color: '#dc2626' }}>{r.original_marks}</strong></td>
                  <td>
                    {r.revised_marks !== null && r.revised_marks !== undefined ? (
                      <strong style={{ color: '#059669' }}>{r.revised_marks}</strong>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      r.status === 'ACCEPTED' ? 'badge-success' :
                      r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.applied_at ? new Date(r.applied_at).toLocaleDateString() : 'Today'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && r.status === 'SUBMITTED' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedReval(r);
                          setRevalReviewForm({
                            status: 'ACCEPTED',
                            revised_marks: r.original_marks + 3,
                            evaluator_remarks: 'Recalculation verified by Departmental Examination Committee.'
                          });
                        }}
                      >
                        <UserCheck size={14} />
                        <span>Review</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {revaluations.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No pending revaluation requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULE EXAM MODAL */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Schedule Examination Slot</h3>
              <button className="icon-btn" onClick={() => setShowScheduleModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSchedule}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Examination:</label>
                <select 
                  className="form-select" 
                  value={scheduleForm.examination_id} 
                  onChange={e => setScheduleForm({...scheduleForm, examination_id: e.target.value})}
                  required
                >
                  <option value="exam-cie1">CIE Unit Test 1</option>
                  <option value="exam-cie2">CIE Unit Test 2</option>
                  <option value="exam-insem">In-Sem Examination</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Course Subject:</label>
                <select 
                  className="form-select" 
                  value={scheduleForm.subject_id} 
                  onChange={e => setScheduleForm({...scheduleForm, subject_id: e.target.value})}
                  required
                >
                  <option value="sub-cs501">CS501: Database Management Systems</option>
                  <option value="sub-cs502">CS502: Theory of Computation</option>
                  <option value="sub-cs503">CS503: Computer Networks</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Date:</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={scheduleForm.exam_date}
                    onChange={e => setScheduleForm({...scheduleForm, exam_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Classroom / Hall:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={scheduleForm.room_or_hall}
                    onChange={e => setScheduleForm({...scheduleForm, room_or_hall: e.target.value})}
                    placeholder="LH-101"
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Time:</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={scheduleForm.start_time}
                    onChange={e => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time:</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={scheduleForm.end_time}
                    onChange={e => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVALUATION REVIEW MODAL */}
      {selectedReval && (
        <div className="modal-overlay" onClick={() => setSelectedReval(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Review Revaluation Request</h3>
              <button className="icon-btn" onClick={() => setSelectedReval(null)}><X size={18} /></button>
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><strong>Student:</strong> {selectedReval.student_name} ({selectedReval.roll_no})</div>
              <div><strong>Subject:</strong> {selectedReval.subject_name}</div>
              <div><strong>Original Marks:</strong> {selectedReval.original_marks}</div>
              <div><strong>Student Reason:</strong> <em>"{selectedReval.reason}"</em></div>
            </div>
            <form onSubmit={handleReviewRevaluation}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Decision Status:</label>
                <select 
                  className="form-select" 
                  value={revalReviewForm.status} 
                  onChange={e => setRevalReviewForm({...revalReviewForm, status: e.target.value})}
                  required
                >
                  <option value="ACCEPTED">ACCEPTED (Revise Marks & Grade)</option>
                  <option value="REJECTED">REJECTED (Original Marks Upheld)</option>
                </select>
              </div>
              {revalReviewForm.status === 'ACCEPTED' && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Revised Marks (Out of 30):</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={revalReviewForm.revised_marks}
                    onChange={e => setRevalReviewForm({...revalReviewForm, revised_marks: e.target.value})}
                    required
                  />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Evaluator Remarks:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={revalReviewForm.evaluator_remarks}
                  onChange={e => setRevalReviewForm({...revalReviewForm, evaluator_remarks: e.target.value})}
                  placeholder="Notes from paper re-checking committee..."
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReval(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Committee Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW REVALUATION REQUEST MODAL (STUDENT / ADMIN) */}
      {showNewRevalModal && (
        <div className="modal-overlay" onClick={() => setShowNewRevalModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Submit Revaluation Application</h3>
              <button className="icon-btn" onClick={() => setShowNewRevalModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitRevaluationRequest}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Select Evaluated Paper / Marks Entry:</label>
                <select 
                  className="form-select"
                  value={newRevalForm.marks_entry_id}
                  onChange={e => setNewRevalForm({...newRevalForm, marks_entry_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose Subject Paper --</option>
                  {marks.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.student_name} - {m.subject_name || 'DBMS'} (Marks: {m.marks_obtained})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Reason for Revaluation / Scrutiny:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={newRevalForm.reason}
                  onChange={e => setNewRevalForm({...newRevalForm, reason: e.target.value})}
                  placeholder="Please state Question numbers or total discrepancies for scrutiny..."
                  required
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewRevalModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit for Revaluation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SEMESTER MARKSHEET MODAL */}
      {selectedStudentMarksheet && (
        <div className="modal-overlay" onClick={() => setSelectedStudentMarksheet(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '680px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#0f172a', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>University Examination Marksheet</span>
              <button className="icon-btn" onClick={() => setSelectedStudentMarksheet(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                <X size={16} />
              </button>
            </div>

            <div id="printable-marksheet" style={{ padding: '28px', background: '#ffffff', color: '#0f172a' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Dr. APJ Abdul Kalam Institute of Technology
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Autonomous Institute Affiliated to State Technological University • NAAC A++ Accredited
                </p>
                <div style={{ display: 'inline-block', border: '1px solid #0f172a', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700, marginTop: '6px' }}>
                  SEMESTER GRADE REPORT (GRADE CARD) • SEMESTER V
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                <div><strong>Student Name:</strong> {selectedStudentMarksheet.student.full_name}</div>
                <div><strong>Permanent Reg No (PRN):</strong> <code>{selectedStudentMarksheet.student.prn}</code></div>
                <div><strong>Roll No:</strong> {selectedStudentMarksheet.student.roll_no}</div>
                <div><strong>Department:</strong> {selectedStudentMarksheet.student.department_name}</div>
                <div><strong>Academic Year:</strong> 2026-2027</div>
                <div><strong>Academic Bank of Credits (ABC):</strong> {selectedStudentMarksheet.student.abc_id}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginBottom: '18px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: 'white' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Course Code</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Course Title</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Credits</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Marks</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Grade</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudentMarksheet.subjects.map((sub, idx) => {
                    const exam = sub.exams[0] || {};
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{sub.code}</td>
                        <td style={{ padding: '8px' }}>{sub.name}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{sub.credits}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{exam.marks || '—'} / {exam.max_marks || 30}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: exam.grade_letter === 'F' ? '#dc2626' : '#2563eb' }}>
                          {exam.grade_letter || 'P'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{exam.grade_point || '7.0'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px solid #2563eb', padding: '12px 18px', borderRadius: '8px', background: '#eff6ff', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>
                    Semester Grade Point Average (SGPA)
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e3a8a' }}>
                    {selectedStudentMarksheet.calculated_sgpa} / 10.0
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>
                    Final Result Status
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                    {selectedStudentMarksheet.result_status}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '32px', fontSize: '0.75rem', color: '#475569', textAlign: 'center' }}>
                <div>
                  <div style={{ borderTop: '1px solid #0f172a', width: '140px', paddingTop: '4px' }}>Controller of Examinations</div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #0f172a', width: '140px', paddingTop: '4px' }}>Principal & Director</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedStudentMarksheet(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                <span>Print Official Marksheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
