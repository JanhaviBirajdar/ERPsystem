import React from 'react';
import { 
  LayoutDashboard, Users, GraduationCap, Calendar, 
  CheckSquare, Award, CreditCard, BookOpen, Briefcase, 
  LifeBuoy, AlertTriangle, ShieldCheck, Settings, 
  ChevronLeft, ChevronRight, LogOut, Sparkles, UserPlus, FileText, Building2
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, user, collapsed, setCollapsed, onOpenCopilot, onLogout }) {
  const role = user?.role || 'SUPER_ADMIN';

  // Navigation items scoped by institutional role
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT', 'ACCOUNTANT', 'LIBRARIAN', 'PLACEMENT_OFFICER'] },
    { id: 'admissions', label: 'Admissions & Intake', icon: UserPlus, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT', 'ADMISSION_OFFICER'] },
    { id: 'students', label: 'Student Info (SIS)', icon: Users, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'ACCOUNTANT'] },
    { id: 'faculty', label: 'Faculty & Workload', icon: GraduationCap, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'] },
    { id: 'academics', label: 'Curriculum & Timetable', icon: Calendar, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT'] },
    { id: 'attendance', label: 'Attendance & QR', icon: CheckSquare, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT'] },
    { id: 'examination', label: 'Examinations & Marks', icon: Award, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT'] },
    { id: 'assignments', label: 'Assignments & Notes', icon: FileText, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT'] },
    { id: 'library', label: 'Library Circulation', icon: BookOpen, roles: ['SUPER_ADMIN', 'LIBRARIAN', 'STUDENT', 'FACULTY'] },
    { id: 'placement', label: 'Training & Placements', icon: Briefcase, roles: ['SUPER_ADMIN', 'PLACEMENT_OFFICER', 'STUDENT', 'HOD'] },
    { id: 'campus', label: 'Campus Operations', icon: Building2, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT'] },
    { id: 'finance', label: 'Fees & Accounts', icon: CreditCard, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'STUDENT'] },
    { id: 'service-desk', label: 'Digital Service Desk', icon: LifeBuoy, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'STUDENT', 'ACCOUNTANT'] },
    { id: 'support', label: 'Early Academic Support', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STUDENT'], badge: 'AI' },
    { id: 'naac', label: 'Accreditation (NAAC/NBA)', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'PRINCIPAL', 'HOD'] },
    { id: 'settings', label: 'Institution & Audits', icon: Settings, roles: ['SUPER_ADMIN', 'PRINCIPAL'] }
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        {!collapsed ? (
          <div className="sidebar-brand">
            <div className="brand-icon-box">
              <GraduationCap size={22} />
            </div>
            <div className="brand-titles">
              <span className="brand-name">AIT Pune ERP</span>
              <span className="brand-tagline">Autonomous Institute</span>
            </div>
          </div>
        ) : (
          <div className="brand-icon-box" style={{ margin: '0 auto' }}>
            <GraduationCap size={20} />
          </div>
        )}

        <button 
          className="icon-btn" 
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-title">Core Management</div>}
        
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={19} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="badge" style={{ background: '#2563eb', color: '#fff', fontSize: '0.65rem' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* AI Campus Copilot Button in Sidebar */}
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={onOpenCopilot}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
              border: 'none',
              padding: collapsed ? '10px 0' : '10px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start'
            }}
            title="Launch AI Campus Copilot"
          >
            <Sparkles size={18} style={{ flexShrink: 0 }} />
            {!collapsed && <span>AI Campus Copilot</span>}
          </button>
        </div>
      </nav>

      {/* Footer / User Profile summary */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <img 
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                alt="Avatar" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.full_name || 'User'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <button 
              className="icon-btn" 
              onClick={onLogout}
              style={{ background: 'transparent', border: 'none', color: '#ef4444' }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button 
            className="icon-btn" 
            onClick={onLogout}
            style={{ margin: '0 auto', background: 'transparent', border: 'none', color: '#ef4444' }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
