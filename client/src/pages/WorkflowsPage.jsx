import React, { useState, useEffect } from 'react';
import { 
  Inbox, FileCheck, Award, Calendar, AlertTriangle, Bell, 
  Download, CheckCircle, XCircle, Clock, Shield, Search, 
  Filter, Plus, RefreshCw, Send, ChevronRight, Eye, Check, 
  AlertCircle, Building2, User, FileText, ArrowRight, Printer,
  Sparkles, CheckSquare, Zap, Megaphone, BarChart3, HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function WorkflowsPage({ user, setTab }) {
  const [activeSubTab, setActiveSubTab] = useState(
    ['STUDENT'].includes(user?.role) ? 'student-self-service' :
    ['FACULTY'].includes(user?.role) ? 'faculty-self-service' : 'inbox'
  );

  // Data states
  const [inboxItems, setInboxItems] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [facultyData, setFacultyData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReportType, setSelectedReportType] = useState('WORKFLOW_COMPLIANCE_DAILY');

  // Modals
  const [actionModal, setActionModal] = useState({ open: false, item: null, action: null, comments: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, item: null });
  const [docModal, setDocModal] = useState({ open: false, doc: null, loading: false });
  const [requestCertModal, setRequestCertModal] = useState(false);
  const [applyLeaveModal, setApplyLeaveModal] = useState(false);
  const [grievanceModal, setGrievanceModal] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState(false);

  // Form states
  const [certForm, setCertForm] = useState({
    certificateType: 'BONAFIDE_CERTIFICATE',
    purpose: 'Passport & International Hackathon Application',
    semester: 'Semester 5',
    copies: 1
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    daysCount: 1,
    reason: '',
    substituteFaculty: ''
  });

  const [grievanceForm, setGrievanceForm] = useState({
    category: 'ACADEMIC',
    title: '',
    description: '',
    priority: 'NORMAL'
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    targetAudience: 'ALL',
    category: 'ACADEMIC',
    priority: 'NORMAL',
    isPinned: false
  });

  const isStaff = ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT'].includes(user?.role);

  useEffect(() => {
    loadTabData();
  }, [activeSubTab, user]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'inbox') {
        const res = await api.workflows.getInbox();
        setInboxItems(res.inbox || []);
      } else if (activeSubTab === 'student-self-service') {
        const res = await api.workflows.getStudentSelfService();
        setStudentData(res);
      } else if (activeSubTab === 'faculty-self-service') {
        const res = await api.workflows.getFacultySelfService();
        setFacultyData(res);
      } else if (activeSubTab === 'notifications') {
        const res = await api.workflows.getNotifications({ search: searchQuery });
        setNotifications(res.notifications || []);
      } else if (activeSubTab === 'announcements') {
        const res = await api.workflows.getAnnouncements();
        setAnnouncements(res.announcements || []);
      } else if (activeSubTab === 'reports') {
        const res = await api.workflows.getReports(selectedReportType);
        setReportData(res.report);
      } else if (activeSubTab === 'definitions') {
        const res = await api.workflows.getDefinitions();
        setDefinitions(res.definitions || []);
      }
    } catch (err) {
      console.error('Failed to load workflow tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step Action (Approve / Reject)
  const handleExecuteAction = async () => {
    if (!actionModal.item || !actionModal.action) return;
    try {
      await api.workflows.executeAction(actionModal.item.id, actionModal.action, actionModal.comments);
      setActionModal({ open: false, item: null, action: null, comments: '' });
      loadTabData();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Submit Certificate
  const handleCreateCertificate = async (e) => {
    e.preventDefault();
    try {
      await api.workflows.startWorkflow({
        definition_id: certForm.certificateType === 'LEAVING_CERTIFICATE' ? 'wf-def-leaving' :
                       certForm.certificateType === 'CHARACTER_CERTIFICATE' ? 'wf-def-character' : 'wf-def-bonafide',
        title: `${certForm.certificateType.replace(/_/g, ' ')} - ${certForm.purpose}`,
        formData: certForm
      });
      setRequestCertModal(false);
      loadTabData();
    } catch (err) {
      alert(`Failed to request certificate: ${err.message}`);
    }
  };

  // Submit Leave
  const handleCreateLeave = async (e) => {
    e.preventDefault();
    try {
      await api.workflows.startWorkflow({
        definition_id: 'wf-def-faculty-leave',
        title: `${leaveForm.leaveType} Leave Application (${leaveForm.daysCount} Days) - ${leaveForm.reason.slice(0, 30)}`,
        formData: leaveForm
      });
      setApplyLeaveModal(false);
      loadTabData();
    } catch (err) {
      alert(`Failed to apply leave: ${err.message}`);
    }
  };

  // Submit Grievance
  const handleCreateGrievance = async (e) => {
    e.preventDefault();
    try {
      await api.workflows.startWorkflow({
        definition_id: 'wf-def-grievance',
        title: `Grievance: ${grievanceForm.title}`,
        priority: grievanceForm.priority,
        formData: grievanceForm
      });
      setGrievanceModal(false);
      loadTabData();
    } catch (err) {
      alert(`Failed to file grievance: ${err.message}`);
    }
  };

  // Publish Announcement
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.workflows.publishAnnouncement(announcementForm);
      setAnnouncementModal(false);
      loadTabData();
    } catch (err) {
      alert(`Failed to post announcement: ${err.message}`);
    }
  };

  // View Document in Modal
  const handleViewDocument = async (docId) => {
    setDocModal({ open: true, doc: null, loading: true });
    try {
      const res = await api.workflows.getDocument(docId);
      setDocModal({ open: true, doc: res.document, loading: false });
    } catch (err) {
      alert(`Failed to load document: ${err.message}`);
      setDocModal({ open: false, doc: null, loading: false });
    }
  };

  // Trigger Scheduler Tick
  const handleTriggerTick = async () => {
    try {
      const res = await api.workflows.triggerSchedulerTick();
      alert(`Scheduler tick executed: ${res.result.workflowsProcessed} workflows inspected, ${res.result.escalationsTriggered} escalations, ${res.result.remindersTriggered} reminders.`);
      loadTabData();
    } catch (err) {
      alert(`Scheduler tick error: ${err.message}`);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const csv = await api.workflows.getReports(selectedReportType, 'csv');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType.toLowerCase()}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="workflows-page animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '24px 28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Sparkles size={13} /> Reusable Workflow Engine
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Automated Approvals • Escalations • Verifiable Documents
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Workflow Automation & Self-Service
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Active Persona: <strong>{user?.full_name}</strong> ({user?.role}) • Department: <strong>{user?.department_id || 'Institutional'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {user?.role === 'STUDENT' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setRequestCertModal(true)}>
                <FileCheck size={16} /> Request Certificate
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setGrievanceModal(true)}>
                <AlertTriangle size={16} /> File Grievance
              </button>
            </>
          )}

          {['FACULTY', 'HOD'].includes(user?.role) && (
            <button className="btn btn-primary btn-sm" onClick={() => setApplyLeaveModal(true)}>
              <Calendar size={16} /> Apply for Leave
            </button>
          )}

          {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
            <button className="btn btn-secondary btn-sm" onClick={() => setAnnouncementModal(true)}>
              <Megaphone size={16} /> Post Announcement
            </button>
          )}

          {['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role) && (
            <button className="btn btn-secondary btn-sm" onClick={handleTriggerTick} title="Trigger background scheduler tick for SLA checks">
              <Zap size={16} color="#d97706" /> Run Scheduler Tick
            </button>
          )}
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border-subtle)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {isStaff && (
          <button
            onClick={() => setActiveSubTab('inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSubTab === 'inbox' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'inbox' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            <Inbox size={17} />
            Approval Inbox
            {inboxItems.length > 0 && (
              <span style={{
                background: activeSubTab === 'inbox' ? '#ffffff' : '#ef4444',
                color: activeSubTab === 'inbox' ? '#2563eb' : '#ffffff',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {inboxItems.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('student-self-service')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSubTab === 'student-self-service' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'student-self-service' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          <Award size={17} />
          Student Self-Service
        </button>

        <button
          onClick={() => setActiveSubTab('faculty-self-service')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSubTab === 'faculty-self-service' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'faculty-self-service' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          <Calendar size={17} />
          Faculty Self-Service
        </button>

        <button
          onClick={() => setActiveSubTab('announcements')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSubTab === 'announcements' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'announcements' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          <Megaphone size={17} />
          Department Notices
        </button>

        <button
          onClick={() => setActiveSubTab('notifications')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSubTab === 'notifications' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'notifications' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          <Bell size={17} />
          Notification Center
        </button>

        {isStaff && (
          <button
            onClick={() => setActiveSubTab('reports')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSubTab === 'reports' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'reports' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={17} />
            SLA & Institutional Reports
          </button>
        )}

        {['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role) && (
          <button
            onClick={() => setActiveSubTab('definitions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSubTab === 'definitions' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'definitions' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            <Shield size={17} />
            Workflow Definitions
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: CENTRALIZED APPROVAL INBOX */}
      {activeSubTab === 'inbox' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Action Required ({inboxItems.length} Pending Approval)
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={loadTabData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {inboxItems.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)'
            }}>
              <CheckCircle size={48} color="#059669" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontWeight: 700 }}>Inbox Zero! All Workflows Processed</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                There are no pending approval requests currently awaiting action for your role ({user?.role}).
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {inboxItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: item.status === 'ESCALATED' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: item.domain === 'CERTIFICATE' ? '#eff6ff' :
                                    item.domain === 'FACULTY_LEAVE' ? '#ecfdf5' : '#fef2f2',
                        color: item.domain === 'CERTIFICATE' ? '#2563eb' :
                               item.domain === 'FACULTY_LEAVE' ? '#059669' : '#dc2626'
                      }}>
                        {item.domain}
                      </span>
                      {item.status === 'ESCALATED' && (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#fee2e2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <AlertTriangle size={12} /> SLA ESCALATED
                        </span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Step {item.current_step} of {item.total_steps}: <strong>{item.currentStepConfig.name}</strong>
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.title}
                    </h3>

                    <div style={{ display: 'flex', gap: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Requester: <strong>{item.requester_name}</strong> ({item.requester_role})</span>
                      <span>Department: <strong>{item.department_name || 'General'}</strong></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> Deadline: {new Date(item.deadline_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setHistoryModal({ open: true, item })}
                    >
                      <Eye size={15} /> Audit Log
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setActionModal({ open: true, item, action: 'REJECTED', comments: '' })}
                      style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setActionModal({ open: true, item, action: 'APPROVED', comments: '' })}
                      style={{ background: '#059669', color: '#fff', border: 'none' }}
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: STUDENT SELF-SERVICE */}
      {activeSubTab === 'student-self-service' && (
        <div>
          {/* Quick Action Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div
              onClick={() => { setCertForm(prev => ({ ...prev, certificateType: 'BONAFIDE_CERTIFICATE' })); setRequestCertModal(true); }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="hover-card"
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <FileCheck size={22} color="#2563eb" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>Bonafide Certificate</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Official verification for passports, education loans, scholarships & internships.
              </p>
            </div>

            <div
              onClick={() => { setCertForm(prev => ({ ...prev, certificateType: 'CHARACTER_CERTIFICATE' })); setRequestCertModal(true); }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="hover-card"
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Award size={22} color="#059669" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>Character & Conduct</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Institutional testimonial attesting to exemplary academic conduct and behavior.
              </p>
            </div>

            <div
              onClick={() => { setCertForm(prev => ({ ...prev, certificateType: 'LEAVING_CERTIFICATE' })); setRequestCertModal(true); }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="hover-card"
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <CheckSquare size={22} color="#d97706" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>College Leaving / Transfer</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Multi-department clearance with accounts and library verification.
              </p>
            </div>

            <div
              onClick={() => setGrievanceModal(true)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="hover-card"
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>Student Grievance Cell</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                UGC/AICTE compliant grievance submission with ombudsman escalation.
              </p>
            </div>
          </div>

          {/* Active Workflows Section with Progress Tracker */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>My Active Applications & Status Trackers</h3>
            {studentData?.workflows?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active requests submitted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {studentData?.workflows?.map(wf => (
                  <div
                    key={wf.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>{wf.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Applied on: {new Date(wf.created_at).toLocaleDateString()} • Ref: #{wf.id}
                        </span>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: wf.status === 'APPROVED' ? '#ecfdf5' :
                                    wf.status === 'REJECTED' ? '#fef2f2' : '#eff6ff',
                        color: wf.status === 'APPROVED' ? '#059669' :
                               wf.status === 'REJECTED' ? '#dc2626' : '#2563eb'
                      }}>
                        {wf.status}
                      </span>
                    </div>

                    {/* Visual Stepper Tracker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
                      {wf.steps.map((st, idx) => {
                        const isDone = wf.current_step > st.step || wf.status === 'APPROVED';
                        const isCurrent = wf.current_step === st.step && wf.status !== 'APPROVED';
                        return (
                          <React.Fragment key={st.step}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isDone ? '#ecfdf5' : isCurrent ? '#eff6ff' : 'var(--bg-muted)',
                              border: isCurrent ? '1.5px solid #2563eb' : '1px solid var(--border-subtle)'
                            }}>
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: isDone ? '#059669' : isCurrent ? '#2563eb' : '#94a3b8',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {isDone ? '✓' : st.step}
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isDone ? '#059669' : isCurrent ? '#2563eb' : 'var(--text-muted)' }}>
                                {st.name} ({st.role})
                              </div>
                            </div>
                            {idx < wf.steps.length - 1 && (
                              <ChevronRight size={16} color="var(--text-muted)" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generated Documents Section */}
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>My Issued Verifiable Documents</h3>
            {studentData?.documents?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No official certificates issued yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {studentData?.documents?.map(doc => (
                  <div
                    key={doc.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '18px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: '4px' }}>
                        VERIFIED SEAL
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(doc.issued_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>{doc.title}</h4>
                    <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      Doc No: {doc.document_number}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Issued by: {doc.issued_by_name || 'Academic Registrar'}
                      </span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleViewDocument(doc.id)}
                      >
                        <Eye size={14} /> View Certificate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: FACULTY SELF-SERVICE */}
      {activeSubTab === 'faculty-self-service' && (
        <div>
          {/* Balance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Casual Leave (CL)</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb', margin: '6px 0' }}>
                {facultyData?.balances?.casual_remaining || 0}
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {facultyData?.balances?.casual_total || 12}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Used: {facultyData?.balances?.casual_used || 0} days</span>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Medical Leave (ML)</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', margin: '6px 0' }}>
                {facultyData?.balances?.medical_remaining || 0}
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {facultyData?.balances?.medical_total || 10}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Used: {facultyData?.balances?.medical_used || 0} days</span>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Earned Leave (EL)</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', margin: '6px 0' }}>
                {facultyData?.balances?.earned_remaining || 0}
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {facultyData?.balances?.earned_total || 15}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Used: {facultyData?.balances?.earned_used || 0} days</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Leave Application History</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setApplyLeaveModal(true)}>
              <Plus size={15} /> Apply New Leave
            </button>
          </div>

          {facultyData?.leaveRequests?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No leave applications submitted.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {facultyData?.leaveRequests?.map(leave => (
                <div
                  key={leave.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '18px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>{leave.title}</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
                      <span>Substitute: <strong>{leave.metadata?.substituteFaculty || 'Arranged'}</strong></span>
                      <span>Applied: {new Date(leave.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: leave.status === 'APPROVED' ? '#ecfdf5' :
                                leave.status === 'REJECTED' ? '#fef2f2' : '#eff6ff',
                    color: leave.status === 'APPROVED' ? '#059669' :
                           leave.status === 'REJECTED' ? '#dc2626' : '#2563eb'
                  }}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: DEPARTMENT ANNOUNCEMENTS */}
      {activeSubTab === 'announcements' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Institutional Notices & Circulars</h2>
            {['SUPER_ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role) && (
              <button className="btn btn-primary btn-sm" onClick={() => setAnnouncementModal(true)}>
                <Plus size={15} /> Post Announcement
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {announcements.map(anc => (
              <div
                key={anc.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: anc.is_pinned ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {anc.is_pinned === 1 && (
                      <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        PINNED
                      </span>
                    )}
                    <span style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                      Audience: {anc.target_audience}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Category: {anc.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(anc.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>{anc.title}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{anc.content}</p>

                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Published by: <strong>{anc.published_by_name}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: SEARCHABLE NOTIFICATION CENTER */}
      {activeSubTab === 'notifications' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search notifications by title or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTabData()}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)'
                }}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadTabData}>
              Search
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                await api.workflows.markAllNotificationsRead();
                loadTabData();
              }}
            >
              Mark All as Read
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                style={{
                  background: notif.is_read ? 'var(--bg-surface)' : 'var(--primary-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: notif.priority === 'URGENT' ? '#fee2e2' : '#f1f5f9',
                      color: notif.priority === 'URGENT' ? '#dc2626' : '#475569'
                    }}>
                      {notif.category}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: notif.is_read ? 600 : 700 }}>
                    {notif.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {notif.message}
                  </p>
                </div>

                {!notif.is_read && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      await api.workflows.markNotificationRead(notif.id);
                      loadTabData();
                    }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: INSTITUTIONAL REPORTS & EXPORTS */}
      {activeSubTab === 'reports' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
              >
                <option value="WORKFLOW_COMPLIANCE_DAILY">SLA & Turnaround Time Compliance</option>
                <option value="CERTIFICATE_ISSUANCE_METRICS">Certificate Issuance Registry</option>
                <option value="DEPARTMENT_LEAVE_UTILIZATION">Faculty Leave Utilization</option>
                <option value="GRIEVANCE_RESOLUTION_AUDIT">Grievance Redressal Audit</option>
              </select>
              <button className="btn btn-secondary btn-sm" onClick={loadTabData}>
                Run Report
              </button>
            </div>

            <button className="btn btn-primary btn-sm" onClick={handleExportCsv}>
              <Download size={15} /> Export as CSV
            </button>
          </div>

          {reportData && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700 }}>{reportData.reportName}</h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Generated at: {new Date(reportData.generatedAt).toLocaleString()}
              </p>

              {reportData.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {Object.entries(reportData.summary).map(([key, val]) => (
                    <div key={key} style={{ background: 'var(--bg-muted)', padding: '14px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reportData.domainBreakdown && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Domain</th>
                      <th style={{ padding: '10px 14px' }}>Total Requests</th>
                      <th style={{ padding: '10px 14px' }}>Approved</th>
                      <th style={{ padding: '10px 14px' }}>SLA Breaches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.domainBreakdown.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.domain}</td>
                        <td style={{ padding: '10px 14px' }}>{row.count}</td>
                        <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 600 }}>{row.approved_count}</td>
                        <td style={{ padding: '10px 14px', color: row.escalated_count > 0 ? '#dc2626' : 'var(--text-muted)' }}>{row.escalated_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 7: WORKFLOW DEFINITIONS & SLA MATRIX */}
      {activeSubTab === 'definitions' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Configurable Multi-Step Approval Workflows</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {definitions.map(def => (
              <div
                key={def.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{def.name}</h3>
                  <span style={{ fontSize: '0.8rem', padding: '3px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', fontWeight: 700 }}>
                    {def.domain}
                  </span>
                </div>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{def.description}</p>

                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700 }}>Configured Approval Chain:</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {def.steps?.map(st => (
                    <div
                      key={st.step}
                      style={{
                        background: 'var(--bg-muted)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#2563eb' }}>Step {st.step}: {st.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Approver: <strong>{st.role}</strong> • SLA: <strong>{st.sla_hours}h</strong> • Escalate: <strong>{st.escalate_to}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: APPROVE / REJECT CONFIRMATION */}
      {actionModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>
              {actionModal.action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Target: <strong>{actionModal.item?.title}</strong> ({actionModal.item?.requester_name})
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                {actionModal.action === 'REJECTED' ? 'Reason for Rejection (Mandatory)*' : 'Remarks / Recommendation (Optional)'}
              </label>
              <textarea
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                value={actionModal.comments}
                onChange={(e) => setActionModal(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Enter remarks..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setActionModal({ open: false, item: null, action: null, comments: '' })}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: actionModal.action === 'APPROVED' ? '#059669' : '#dc2626', border: 'none' }}
                onClick={handleExecuteAction}
              >
                Confirm {actionModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDIT TRAIL / TIMELINE */}
      {historyModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '14px', maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Workflow Audit Trail</h3>
              <button className="icon-btn" onClick={() => setHistoryModal({ open: false, item: null })}>✕</button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Ref: #{historyModal.item?.id} • {historyModal.item?.title}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historyModal.item?.stepLogs?.map((log, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--bg-muted)', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{log.action}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>{log.comments || 'No comment provided.'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Actor: {log.actor_name} ({log.actor_role})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW OFFICIAL DOCUMENT */}
      {docModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Official Document Viewer</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button className="icon-btn" onClick={() => setDocModal({ open: false, doc: null, loading: false })}>✕</button>
              </div>
            </div>

            {docModal.loading ? (
              <p>Loading document from cryptographic archives...</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: docModal.doc?.content_html }} />
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: REQUEST CERTIFICATE MODAL */}
      {requestCertModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <form onSubmit={handleCreateCertificate} style={{
            background: 'var(--bg-surface)', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Request Official Student Certificate</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Certificate Type</label>
              <select
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={certForm.certificateType}
                onChange={(e) => setCertForm(prev => ({ ...prev, certificateType: e.target.value }))}
              >
                <option value="BONAFIDE_CERTIFICATE">Bonafide Certificate</option>
                <option value="CHARACTER_CERTIFICATE">Character & Conduct Certificate</option>
                <option value="LEAVING_CERTIFICATE">College Leaving Certificate</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Specific Purpose *</label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={certForm.purpose}
                onChange={(e) => setCertForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="e.g. Passport application, Education Loan, Internship"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRequestCertModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: APPLY FOR LEAVE MODAL */}
      {applyLeaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <form onSubmit={handleCreateLeave} style={{
            background: 'var(--bg-surface)', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Faculty Leave Application</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Leave Type</label>
              <select
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value }))}
              >
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="MEDICAL">Medical Leave (ML)</option>
                <option value="EARNED">Earned Leave (EL)</option>
                <option value="DUTY">On Duty (OD) / Conference</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Start Date</label>
                <input
                  type="date"
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Substitute Faculty Arrangement</label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                placeholder="Prof. Name (Lectures / Labs to be covered)"
                value={leaveForm.substituteFaculty}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, substituteFaculty: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason</label>
              <textarea
                rows={2}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setApplyLeaveModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Submit Leave Request</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: FILE GRIEVANCE MODAL */}
      {grievanceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <form onSubmit={handleCreateGrievance} style={{
            background: 'var(--bg-surface)', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>File Student Grievance / Ticket</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={grievanceForm.category}
                onChange={(e) => setGrievanceForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="ACADEMIC">Academic / Evaluation</option>
                <option value="INFRASTRUCTURE">Campus Infrastructure / Labs</option>
                <option value="HOSTEL_TRANSPORT">Hostel & Transport</option>
                <option value="ANTI_RAGGING">Anti-Ragging / Student Welfare</option>
                <option value="FEES">Fees & Accounts</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Title</label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={grievanceForm.title}
                onChange={(e) => setGrievanceForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief summary of issue"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Detailed Explanation</label>
              <textarea
                rows={3}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={grievanceForm.description}
                onChange={(e) => setGrievanceForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setGrievanceModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Submit Grievance</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 7: POST ANNOUNCEMENT MODAL */}
      {announcementModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <form onSubmit={handlePublishAnnouncement} style={{
            background: 'var(--bg-surface)', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Post Targeted Announcement</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Title</label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Audience</label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                  value={announcementForm.targetAudience}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                >
                  <option value="ALL">All Campus (Everyone)</option>
                  <option value="STUDENTS">Students Only</option>
                  <option value="FACULTY">Faculty & Staff</option>
                  <option value="HOD">Department HODs</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                  value={announcementForm.category}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="EXAMINATION">Examination</option>
                  <option value="PLACEMENT">Placement</option>
                  <option value="EVENT">Campus Event</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Content</label>
              <textarea
                rows={3}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAnnouncementModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Broadcast Notice</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
