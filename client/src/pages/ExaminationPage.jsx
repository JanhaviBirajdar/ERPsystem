import React, { useState, useEffect } from 'react';
import { Award, Lock, Unlock, Printer, Eye, Check, X, ShieldCheck, Download } from 'lucide-react';
import { api } from '../services/api';

export default function ExaminationPage({ user }) {
  const [activeTab, setActiveTab] = useState('marks-entry');
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('exam-cie1');
  const [selectedSubject, setSelectedSubject] = useState('sub-cs501');
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Marksheet Modal State
  const [selectedStudentMarksheet, setSelectedStudentMarksheet] = useState(null);

  useEffect(() => {
    loadExams();
    loadMarks();
  }, [selectedExam, selectedSubject]);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Examination, CIE & Grade Engine</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Continuous Internal Evaluation (CIE), locked grade point calculations, and verifiable marksheets
          </p>
        </div>

        {['SUPER_ADMIN', 'HOD'].includes(user?.role) && (
          <button className="btn btn-secondary" onClick={handleLockMarks}>
            <Lock size={15} />
            <span>Lock CIE Marks</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
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

      {/* Marks Table */}
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

      {/* =========================================================================
          OFFICIAL SEMESTER MARKSHEET MODAL
          ========================================================================= */}
      {selectedStudentMarksheet && (
        <div className="modal-overlay" onClick={() => setSelectedStudentMarksheet(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '680px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#0f172a', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>University Examination Marksheet</span>
              <button className="icon-btn" onClick={() => setSelectedStudentMarksheet(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                <X size={16} />
              </button>
            </div>

            {/* Printable Marksheet Area */}
            <div id="printable-marksheet" style={{ padding: '28px', background: '#ffffff', color: '#0f172a' }}>
              {/* Institution Seal & Title */}
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

              {/* Student Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                <div><strong>Student Name:</strong> {selectedStudentMarksheet.student.full_name}</div>
                <div><strong>Permanent Reg No (PRN):</strong> <code>{selectedStudentMarksheet.student.prn}</code></div>
                <div><strong>Roll No:</strong> {selectedStudentMarksheet.student.roll_no}</div>
                <div><strong>Department:</strong> {selectedStudentMarksheet.student.department_name}</div>
                <div><strong>Academic Year:</strong> 2026-2027</div>
                <div><strong>Academic Bank of Credits (ABC):</strong> {selectedStudentMarksheet.student.abc_id}</div>
              </div>

              {/* Subject Grades Table */}
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

              {/* Result Summary Box */}
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

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '32px', fontSize: '0.75rem', color: '#475569', textAlign: 'center' }}>
                <div>
                  <div style={{ borderTop: '1px solid #0f172a', width: '140px', paddingTop: '4px' }}>Controller of Examinations</div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #0f172a', width: '140px', paddingTop: '4px' }}>Principal & Director</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
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
