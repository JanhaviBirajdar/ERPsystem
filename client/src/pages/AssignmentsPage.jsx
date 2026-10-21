import React, { useState, useEffect } from 'react';
import { 
  BookOpen, FileText, Upload, CheckCircle2, Clock, AlertTriangle, 
  Download, Eye, Plus, X, Search, Filter, Calendar, Award, UserCheck, 
  ExternalLink, FileCheck, Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function AssignmentsPage({ user }) {
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');

  // Submissions review state (Faculty view)
  const [selectedAssignmentForReview, setSelectedAssignmentForReview] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marks_obtained: '', feedback: '' });

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    subject_id: 'sub-cs501',
    division_id: 'div-comp-5a',
    max_marks: 20,
    due_date: '2026-11-20',
    attachment_url: 'https://aitpune.ac.in/academic-guidelines.pdf'
  });

  // Student Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [targetAssignment, setTargetAssignment] = useState(null);
  const [submitForm, setSubmitForm] = useState({
    submission_text: '',
    file_url: 'https://github.com/student-lab-assignment'
  });

  // Upload Resource Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    subject_id: 'sub-cs501',
    module_number: 1,
    resource_type: 'LECTURE_NOTES',
    file_url: 'https://aitpune.ac.in/resources/dbms-unit1.pdf',
    file_size_kb: 1450
  });

  useEffect(() => {
    loadAssignments();
    loadResources();
  }, [selectedSubject, selectedDivision]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedDivision) params.division_id = selectedDivision;
      const res = await api.assignments.getAll(params);
      setAssignments(res.assignments || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const params = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      const res = await api.assignments.getResources(params);
      setResources(res.resources || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.assignments.create(assignmentForm);
      alert('Course assignment published successfully!');
      setShowCreateModal(false);
      setAssignmentForm({
        title: '',
        description: '',
        subject_id: 'sub-cs501',
        division_id: 'div-comp-5a',
        max_marks: 20,
        due_date: '2026-11-20',
        attachment_url: 'https://aitpune.ac.in/academic-guidelines.pdf'
      });
      loadAssignments();
    } catch (err) {
      alert(`Error creating assignment: ${err.message}`);
    }
  };

  const handleOpenReview = async (asgn) => {
    setSelectedAssignmentForReview(asgn);
    try {
      const res = await api.assignments.getSubmissions(asgn.id);
      setSubmissionsList(res.submissions || []);
      setActiveTab('submissions');
    } catch (err) {
      alert(`Failed to load submissions: ${err.message}`);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!targetAssignment) return;
    try {
      const res = await api.assignments.submit(targetAssignment.id, submitForm);
      alert(res.message || 'Assignment submitted successfully!');
      setShowSubmitModal(false);
      setSubmitForm({ submission_text: '', file_url: '' });
      loadAssignments();
    } catch (err) {
      alert(`Error submitting assignment: ${err.message}`);
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    if (!selectedSubmissionToGrade) return;
    try {
      await api.assignments.grade(selectedSubmissionToGrade.id, gradeForm);
      alert('Marks and feedback recorded successfully!');
      setSelectedSubmissionToGrade(null);
      if (selectedAssignmentForReview) {
        const res = await api.assignments.getSubmissions(selectedAssignmentForReview.id);
        setSubmissionsList(res.submissions || []);
      }
    } catch (err) {
      alert(`Grading failed: ${err.message}`);
    }
  };

  const handleUploadResource = async (e) => {
    e.preventDefault();
    try {
      await api.assignments.createResource(resourceForm);
      alert('Academic resource uploaded successfully!');
      setShowUploadModal(false);
      loadResources();
    } catch (err) {
      alert(`Error uploading resource: ${err.message}`);
    }
  };

  const isFacultyOrAdmin = ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'].includes(user?.role);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="text-primary" size={24} />
            Assignments & Academic Learning Resources
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Coursework submissions, deadline tracking, rubrics grading, and curated digital study materials
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isFacultyOrAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} />
                <span>Upload Study Material</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} />
                <span>Create New Assignment</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'assignments' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'assignments' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Active Coursework ({assignments.length})
        </button>

        {isFacultyOrAdmin && (
          <button
            className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('submissions')}
            style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'submissions' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'submissions' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Submissions & Evaluation {selectedAssignmentForReview ? `(${selectedAssignmentForReview.title})` : ''}
          </button>
        )}

        <button
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'resources' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'resources' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Study Materials & Digital Notes ({resources.length})
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS LIST */}
      {activeTab === 'assignments' && (
        <div>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter Subject:</span>
                <select 
                  className="form-select"
                  style={{ width: 'auto', minWidth: '220px' }}
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">All Subjects</option>
                  <option value="sub-cs501">CS501: DBMS</option>
                  <option value="sub-cs502">CS502: Theory of Computation</option>
                  <option value="sub-cs503">CS503: Computer Networks</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Division:</span>
                <select 
                  className="form-select"
                  style={{ width: 'auto', minWidth: '180px' }}
                  value={selectedDivision}
                  onChange={e => setSelectedDivision(e.target.value)}
                >
                  <option value="">All Divisions</option>
                  <option value="div-comp-5a">TE Comp Div A</option>
                  <option value="div-comp-5b">TE Comp Div B</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {assignments.map(a => {
              const isPastDue = new Date() > new Date(a.due_date);
              const mySub = a.mySubmission;

              return (
                <div key={a.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span className="badge badge-info">{a.subject_code} • {a.division_name}</span>
                    <span className="badge badge-secondary" style={{ fontWeight: 700 }}>Max {a.max_marks} Pts</span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0' }}>{a.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', flex: 1 }}>
                    {a.description || 'Complete the assignment questions following lab guidelines.'}
                  </p>

                  <div style={{ background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Faculty In-charge:</span>
                      <strong>{a.faculty_name || 'Prof. Faculty'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Deadline:</span>
                      <strong style={{ color: isPastDue ? '#dc2626' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {a.due_date}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Submissions:</span>
                      <strong>{a.submission_count || 0} students</strong>
                    </div>
                  </div>

                  {/* Student View Specific Status */}
                  {user?.role === 'STUDENT' && (
                    <div style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: mySub ? '#ecfdf5' : '#fffbeb', border: mySub ? '1px solid #10b981' : '1px solid #f59e0b', color: mySub ? '#065f46' : '#92400e' }}>
                      {mySub ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <CheckCircle2 size={14} /> Submitted ({mySub.status})
                          </span>
                          {mySub.status === 'GRADED' && (
                            <strong>Grade: {mySub.marks_obtained}/{a.max_marks}</strong>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <AlertTriangle size={14} /> Pending Submission
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    {isFacultyOrAdmin ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenReview(a)}>
                        <Eye size={14} />
                        <span>View Submissions ({a.submission_count || 0})</span>
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setTargetAssignment(a);
                          setShowSubmitModal(true);
                        }}
                      >
                        <Upload size={14} />
                        <span>{mySub ? 'Resubmit Assignment' : 'Submit Assignment'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY SUBMISSIONS REVIEW */}
      {activeTab === 'submissions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {selectedAssignmentForReview ? `Submissions: ${selectedAssignmentForReview.title}` : 'Select an assignment to view submissions'}
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('assignments')}>
              Back to Assignments
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>PRN</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Marks Obtained</th>
                  <th>Feedback</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissionsList.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.roll_no}</strong></td>
                    <td><strong>{sub.student_name}</strong></td>
                    <td><code>{sub.prn}</code></td>
                    <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${
                        sub.status === 'GRADED' ? 'badge-success' :
                        sub.status === 'LATE' ? 'badge-danger' : 'badge-info'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      {sub.status === 'GRADED' ? (
                        <strong>{sub.marks_obtained} Pts</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unmarked</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sub.feedback || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedSubmissionToGrade(sub);
                          setGradeForm({
                            marks_obtained: sub.marks_obtained !== null && sub.marks_obtained !== undefined ? sub.marks_obtained : '',
                            feedback: sub.feedback || 'Good attempt. Accurate schema designs.'
                          });
                        }}
                      >
                        <Award size={14} />
                        <span>{sub.status === 'GRADED' ? 'Re-grade' : 'Grade'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {submissionsList.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No submissions found for this assignment yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC STUDY MATERIALS */}
      {activeTab === 'resources' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Resource Title</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Access</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(res => (
                <tr key={res.id}>
                  <td>
                    <span className="badge badge-secondary" style={{ fontWeight: 700 }}>
                      Unit {res.module_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} className="text-primary" />
                      <strong>{res.title}</strong>
                    </div>
                  </td>
                  <td>
                    <span>{res.subject_code}: {res.subject_name}</span>
                  </td>
                  <td>
                    <span className="badge badge-info">{res.resource_type}</span>
                  </td>
                  <td>{res.faculty_name || 'Department Faculty'}</td>
                  <td>{(res.file_size_kb / 1024).toFixed(1)} MB</td>
                  <td style={{ textAlign: 'right' }}>
                    <a 
                      href={res.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              ))}
              {resources.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No study materials uploaded for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CREATE ASSIGNMENT */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Create New Course Assignment</h3>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Assignment Title:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={assignmentForm.title}
                  onChange={e => setAssignmentForm({...assignmentForm, title: e.target.value})}
                  placeholder="e.g., Assignment 2: SQL Complex Joins & Normalization"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Description & Instructions:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={assignmentForm.description}
                  onChange={e => setAssignmentForm({...assignmentForm, description: e.target.value})}
                  placeholder="Write clear lab requirements, expected outputs and submission criteria..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Subject:</label>
                  <select 
                    className="form-select"
                    value={assignmentForm.subject_id}
                    onChange={e => setAssignmentForm({...assignmentForm, subject_id: e.target.value})}
                    required
                  >
                    <option value="sub-cs501">CS501: DBMS</option>
                    <option value="sub-cs502">CS502: TOC</option>
                    <option value="sub-cs503">CS503: CN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Division:</label>
                  <select 
                    className="form-select"
                    value={assignmentForm.division_id}
                    onChange={e => setAssignmentForm({...assignmentForm, division_id: e.target.value})}
                    required
                  >
                    <option value="div-comp-5a">TE Comp Div A</option>
                    <option value="div-comp-5b">TE Comp Div B</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Due Date:</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={assignmentForm.due_date}
                    onChange={e => setAssignmentForm({...assignmentForm, due_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Marks:</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={assignmentForm.max_marks}
                    onChange={e => setAssignmentForm({...assignmentForm, max_marks: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT SUBMISSION */}
      {showSubmitModal && targetAssignment && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Submit Assignment: {targetAssignment.title}</h3>
              <button className="icon-btn" onClick={() => setShowSubmitModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStudentSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Submission Link / File URL (GitHub or Google Drive):</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={submitForm.file_url}
                  onChange={e => setSubmitForm({...submitForm, file_url: e.target.value})}
                  placeholder="https://drive.google.com/..."
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Student Remarks / Summary:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={submitForm.submission_text}
                  onChange={e => setSubmitForm({...submitForm, submission_text: e.target.value})}
                  placeholder="All queries tested on PostgreSQL and MySQL successfully..."
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Submission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRADE SUBMISSION */}
      {selectedSubmissionToGrade && (
        <div className="modal-overlay" onClick={() => setSelectedSubmissionToGrade(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Evaluate Student Submission</h3>
              <button className="icon-btn" onClick={() => setSelectedSubmissionToGrade(null)}><X size={18} /></button>
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><strong>Student:</strong> {selectedSubmissionToGrade.student_name} ({selectedSubmissionToGrade.roll_no})</div>
              <div><strong>PRN:</strong> <code>{selectedSubmissionToGrade.prn}</code></div>
              <div style={{ marginTop: '4px' }}>
                <strong>File URL:</strong>{' '}
                <a href={selectedSubmissionToGrade.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>
                  {selectedSubmissionToGrade.file_url}
                </a>
              </div>
            </div>
            <form onSubmit={handleGradeSubmission}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Marks Awarded (Out of {selectedAssignmentForReview?.max_marks || 20}):</label>
                <input 
                  type="number" 
                  min="0" 
                  max={selectedAssignmentForReview?.max_marks || 20}
                  className="form-input" 
                  value={gradeForm.marks_obtained}
                  onChange={e => setGradeForm({...gradeForm, marks_obtained: e.target.value})}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Qualitative Feedback:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={gradeForm.feedback}
                  onChange={e => setGradeForm({...gradeForm, feedback: e.target.value})}
                  placeholder="Feedback on code efficiency, query optimization, etc."
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedSubmissionToGrade(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Evaluation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD STUDY RESOURCE */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Upload Course Study Material</h3>
              <button className="icon-btn" onClick={() => setShowUploadModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadResource}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Document / Resource Title:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={resourceForm.title}
                  onChange={e => setResourceForm({...resourceForm, title: e.target.value})}
                  placeholder="e.g., Module 2: Transaction Management & ACID Properties Notes"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Subject:</label>
                  <select 
                    className="form-select"
                    value={resourceForm.subject_id}
                    onChange={e => setResourceForm({...resourceForm, subject_id: e.target.value})}
                    required
                  >
                    <option value="sub-cs501">CS501: DBMS</option>
                    <option value="sub-cs502">CS502: TOC</option>
                    <option value="sub-cs503">CS503: CN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Syllabus Module Unit:</label>
                  <select 
                    className="form-select"
                    value={resourceForm.module_number}
                    onChange={e => setResourceForm({...resourceForm, module_number: e.target.value})}
                    required
                  >
                    <option value="1">Unit 1</option>
                    <option value="2">Unit 2</option>
                    <option value="3">Unit 3</option>
                    <option value="4">Unit 4</option>
                    <option value="5">Unit 5</option>
                    <option value="6">Unit 6</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Resource Type:</label>
                <select 
                  className="form-select"
                  value={resourceForm.resource_type}
                  onChange={e => setResourceForm({...resourceForm, resource_type: e.target.value})}
                  required
                >
                  <option value="LECTURE_NOTES">Lecture Notes (PDF)</option>
                  <option value="LAB_MANUAL">Laboratory Manual</option>
                  <option value="QUESTION_BANK">Question Bank / PYQs</option>
                  <option value="SLIDES">Lecture Presentation Slides</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Resource Document URL:</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={resourceForm.file_url}
                  onChange={e => setResourceForm({...resourceForm, file_url: e.target.value})}
                  placeholder="https://aitpune.ac.in/academic-resources/notes.pdf"
                  required
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Upload Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
