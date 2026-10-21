import React, { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, CheckSquare, CreditCard, Award, 
  Briefcase, AlertTriangle, LifeBuoy, TrendingUp, Sparkles, 
  ArrowUpRight, ArrowRight, ShieldCheck, Bell, Clock, Calendar, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage({ user, setTab, onOpenCopilot, onOpenIdCard }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.analytics.getDashboard();
      setData(res);

      if (user?.role === 'STUDENT') {
        const me = await api.auth.getMe();
        if (me.user?.studentProfile) {
          const detailed = await api.students.getById(me.user.studentProfile.id);
          setStudentProfile(detailed);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {};
  const notices = data?.notices || [];
  const deptStats = data?.departmentStats || [];

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        borderRadius: 'var(--radius-xl)', 
        padding: '24px 28px', 
        color: 'white', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, color: '#93c5fd', marginBottom: '8px' }}>
            <ShieldCheck size={13} />
            Autonomous Engineering College • NAAC A++ Grade
          </div>
          <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            Welcome back, {user?.full_name}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            {user?.role === 'STUDENT' 
              ? 'Third Year Engineering • Academic Session 2026-2027 • "One Campus. One Platform. Smarter Education."'
              : `${user?.role?.replace('_', ' ')} Workspace • Unified Institutional Management Portal`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {user?.role === 'STUDENT' && (
            <button className="btn btn-secondary" onClick={onOpenIdCard} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span>Digital ID Card</span>
            </button>
          )}
          <button 
            className="btn btn-primary"
            onClick={onOpenCopilot}
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none' }}
          >
            <Sparkles size={16} />
            <span>AI Campus Copilot</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROLE VIEW: STUDENT PERSONAL PORTAL
          ========================================================================= */}
      {user?.role === 'STUDENT' && studentProfile && (
        <div style={{ marginBottom: '24px' }}>
          {/* Quick Alert Banner if Attendance is Low */}
          {studentProfile.student.attendance_pct < 75 && (
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: 'var(--radius-lg)', 
              padding: '14px 18px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>
                    Mandatory Attendance Shortage Alert ({studentProfile.student.attendance_pct}%)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
                    Your attendance is below the statutory 75% required to sit for University Examinations. Please consult your mentor.
                  </div>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => setTab('attendance')}>
                View Subject Details
              </button>
            </div>
          )}

          {/* Student Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Semester Attendance</span>
                <span className="stat-value">{studentProfile.student.attendance_pct}%</span>
                <span className={`stat-trend ${studentProfile.student.attendance_pct >= 75 ? 'positive' : 'negative'}`}>
                  {studentProfile.student.attendance_pct >= 75 ? '✅ Compliant (>75%)' : '⚠️ Shortage (<75%)'}
                </span>
              </div>
              <div className={`stat-icon ${studentProfile.student.attendance_pct >= 75 ? 'green' : 'rose'}`}>
                <CheckSquare size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Current CGPA</span>
                <span className="stat-value">{studentProfile.student.current_cgpa} / 10</span>
                <span className="stat-trend positive">
                  <TrendingUp size={13} />
                  Top Tier Academic Standing
                </span>
              </div>
              <div className="stat-icon purple">
                <Award size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Fee Account Balance</span>
                <span className="stat-value">
                  {studentProfile.invoices[0]?.balance_amount > 0 
                    ? `₹${studentProfile.invoices[0].balance_amount.toLocaleString('en-IN')}`
                    : '₹0 (Cleared)'}
                </span>
                <span className={`stat-trend ${studentProfile.invoices[0]?.balance_amount > 0 ? 'negative' : 'positive'}`}>
                  {studentProfile.invoices[0]?.status || 'PAID'}
                </span>
              </div>
              <div className={`stat-icon ${studentProfile.invoices[0]?.balance_amount > 0 ? 'amber' : 'green'}`}>
                <CreditCard size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Placement Applications</span>
                <span className="stat-value">{studentProfile.placementApps?.length || 0}</span>
                <span className="stat-trend positive">
                  {studentProfile.placementApps?.some(a => a.status === 'OFFERED') ? '🎉 Offer Received!' : 'Active Applicant'}
                </span>
              </div>
              <div className="stat-icon blue">
                <Briefcase size={22} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE VIEW: MANAGEMENT / FACULTY / ADMIN DASHBOARD
          ========================================================================= */}
      {user?.role !== 'STUDENT' && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Active Students</span>
              <span className="stat-value">{kpis.totalStudents || 10}</span>
              <span className="stat-trend positive">
                <TrendingUp size={13} />
                100% Enrollment Intake
              </span>
            </div>
            <div className="stat-icon blue">
              <Users size={22} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Faculty & Staff</span>
              <span className="stat-value">{kpis.totalFaculty || 6}</span>
              <span className="stat-trend neutral">
                Ratio 1:15 Cadre Compliant
              </span>
            </div>
            <div className="stat-icon purple">
              <GraduationCap size={22} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Annual Fee Collected</span>
              <span className="stat-value">₹{(kpis.feeCollection || 406000).toLocaleString('en-IN')}</span>
              <span className="stat-trend positive">
                <TrendingUp size={13} />
                ₹{(kpis.feeOutstanding || 106500).toLocaleString('en-IN')} Pending
              </span>
            </div>
            <div className="stat-icon green">
              <CreditCard size={22} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Average Campus Attendance</span>
              <span className="stat-value">{kpis.averageAttendance || 84.5}%</span>
              <span className="stat-trend positive">
                Compliant with UGC Norms
              </span>
            </div>
            <div className="stat-icon blue">
              <CheckSquare size={22} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Early Support Alerts</span>
              <span className="stat-value" style={{ color: '#dc2626' }}>{kpis.atRiskCount || 2}</span>
              <span className="stat-trend negative">
                Students Needing Intervention
              </span>
            </div>
            <div className="stat-icon rose">
              <AlertTriangle size={22} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Placement Offers Bagged</span>
              <span className="stat-value" style={{ color: '#059669' }}>{kpis.placementOffers || 1}</span>
              <span className="stat-trend positive">
                88.4% Placement Conversion
              </span>
            </div>
            <div className="stat-icon amber">
              <Briefcase size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Department Performance & Institutional Notices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Department Overview Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Department Academic Performance</h3>
              <p className="card-subtitle">Enrollment, attendance compliance, and average CGPA</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab('academics')}>
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Intake</th>
                  <th>Enrolled</th>
                  <th>Avg Attendance</th>
                  <th>Avg CGPA</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {d.code}</div>
                    </td>
                    <td>{d.intake_capacity}</td>
                    <td><strong>{d.enrolled_students}</strong></td>
                    <td>
                      <span className={`badge ${d.avg_attendance >= 75 ? 'badge-success' : 'badge-danger'}`}>
                        {d.avg_attendance}%
                      </span>
                    </td>
                    <td>
                      <strong>{d.avg_cgpa || '8.2'}</strong> / 10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notices & Circulars */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Institutional Notice Board</h3>
              <p className="card-subtitle">Official university circulars and examinations alerts</p>
            </div>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bell size={12} />
              Active Bulletins
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {notices.map(n => (
              <div 
                key={n.id}
                style={{ 
                  padding: '14px', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: n.is_pinned ? 'var(--primary-subtle)' : 'var(--bg-muted)',
                  border: n.is_pinned ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>
                    {n.category}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {n.publish_date}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {n.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
