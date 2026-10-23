import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AICopilotModal from './components/AICopilotModal';
import UniversalSearchModal from './components/UniversalSearchModal';
import DigitalIdCardModal from './components/DigitalIdCardModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import AdmissionsPage from './pages/AdmissionsPage';
import StudentsPage from './pages/StudentsPage';
import FacultyPage from './pages/FacultyPage';
import AttendancePage from './pages/AttendancePage';
import AcademicsPage from './pages/AcademicsPage';
import ExaminationPage from './pages/ExaminationPage';
import AssignmentsPage from './pages/AssignmentsPage';
import FinancePage from './pages/FinancePage';
import LibraryPage from './pages/LibraryPage';
import PlacementPage from './pages/PlacementPage';
import CampusOperationsPage from './pages/CampusOperationsPage';
import ServiceDeskPage from './pages/ServiceDeskPage';
import SupportSystemPage from './pages/SupportSystemPage';
import NaacPage from './pages/NaacPage';
import SettingsPage from './pages/SettingsPage';
import WorkflowsPage from './pages/WorkflowsPage';

import { api } from './services/api';
import { GraduationCap, Shield, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const FALLBACK_DEMO_USERS = [
  { role: 'SUPER_ADMIN', username: 'admin', label: 'Super Admin', name: 'Er. Sanjay Singhania', dept: 'Central Admin' },
  { role: 'PRINCIPAL', username: 'principal', label: 'Principal / Director', name: 'Dr. Anand M. Joshi', dept: 'Executive Office' },
  { role: 'HOD', username: 'hod_comp', label: 'HOD Computer Engg', name: 'Dr. Rajesh Sharma', dept: 'Computer Engineering' },
  { role: 'FACULTY', username: 'faculty_mehta', label: 'Faculty (Assoc. Prof)', name: 'Prof. Priya Mehta', dept: 'Computer Engineering' },
  { role: 'STUDENT', username: 'stud_aarav', label: 'Student (Merit)', name: 'Aarav Sharma (PRN 0045)', dept: 'Computer Engg (Sem 5)' },
  { role: 'STUDENT', username: 'stud_rohan', label: 'Student (At-Risk / Dues)', name: 'Rohan Verma (PRN 0078)', dept: 'Computer Engg (Sem 5)' },
  { role: 'ACCOUNTANT', username: 'accountant', label: 'Finance Officer', name: 'Suresh Kulkarni', dept: 'Accounts Section' },
  { role: 'LIBRARIAN', username: 'librarian', label: 'Chief Librarian', name: 'Sunita Shinde', dept: 'Central Library' },
  { role: 'PLACEMENT_OFFICER', username: 'tpo', label: 'Training & Placement Officer', name: 'Dr. Alok Mathur', dept: 'T&P Cell' }
];

const DEFAULT_ADMIN_USER = {
  id: 'usr-admin-01',
  username: 'admin',
  full_name: 'Er. Sanjay Singhania',
  email: 'admin@aitpune.edu.in',
  role: 'SUPER_ADMIN',
  department_id: 'dept-admin',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
};

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('erp_theme') || 'light');
  const [user, setUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState(FALLBACK_DEMO_USERS);
  const [currentTab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [institution, setInstitution] = useState(null);

  // Modals
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [cardStudent, setCardStudent] = useState(null);

  // Loading
  const [loading, setLoading] = useState(true);

  // Theme synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  // Keyboard shortcut listener (Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialization
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Fetch demo personas list
      const demoRes = await api.auth.getDemoUsers().catch(() => ({ demoUsers: FALLBACK_DEMO_USERS }));
      if (demoRes?.demoUsers?.length > 0) {
        setDemoUsers(demoRes.demoUsers);
      }

      // 2. Fetch institution configuration
      const instRes = await api.institution.get().catch(() => ({
        institution: {
          name: 'Dr. APJ Abdul Kalam Institute of Technology',
          tagline: 'Autonomous Institute Affiliated to SPPU, Approved by AICTE, Accredited NAAC A+',
          code: 'AIT-PUNE',
          naac_grade: 'A+'
        }
      }));
      if (instRes?.institution) {
        setInstitution(instRes.institution);
      }

      // 3. Check existing authentication or auto-login with first persona
      const token = localStorage.getItem('erp_token');
      if (token) {
        try {
          const meRes = await api.auth.getMe();
          setUser(meRes.user);
        } catch (e) {
          // Token expired, auto switch to default admin demo
          await switchPersona('admin');
        }
      } else {
        await switchPersona('admin');
      }
    } catch (err) {
      console.warn('App init soft error:', err);
    } finally {
      setUser(prev => prev || DEFAULT_ADMIN_USER);
      setLoading(false);
    }
  };

  const switchPersona = async (username) => {
    try {
      const res = await api.auth.switchDemo(username);
      if (res?.token) {
        localStorage.setItem('erp_token', res.token);
      }
      if (res?.user) {
        setUser(res.user);
        if (res.user.studentProfile) {
          setCardStudent(res.user.studentProfile);
        }
        return;
      }
    } catch (err) {
      console.warn('Switch persona remote call fallback:', err);
    }

    // Client-side fallback if serverless API is warming up
    const target = demoUsers.find(u => u.username === username) || FALLBACK_DEMO_USERS.find(u => u.username === username) || DEFAULT_ADMIN_USER;
    setUser({
      id: `usr-${target.username}`,
      username: target.username,
      full_name: target.name,
      email: `${target.username}@aitpune.edu.in`,
      role: target.role,
      department_id: target.dept || 'General',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    setUser(null);
  };

  const handleOpenStudentIdCard = (studentProfile) => {
    setCardStudent(studentProfile || user?.studentProfile);
    setIsIdCardOpen(true);
  };

  const handleSelectSearchResult = (category, id) => {
    setTab(category);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
          <GraduationCap size={36} color="white" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Dr. APJ Abdul Kalam Institute of Technology</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px' }}>Loading Unified College ERP System...</p>
      </div>
    );
  }

  // Fallback Login Screen if user explicitly logged out
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '720px', width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '40px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(37,99,235,0.25)' }}>
              <GraduationCap size={36} color="white" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>AIT Pune College ERP</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px' }}>
              One Campus. One Platform. Smarter Education. • Select Demo Persona to Sign In:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {demoUsers.map(u => (
              <button
                key={u.username}
                onClick={() => switchPersona(u.username)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px',
                  color: '#0f172a',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {u.label}
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{u.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{u.dept}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Role-Aware Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setTab={setTab}
        user={user}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Layout Area */}
      <div className="main-layout">
        {/* Header with Search & Instant Role Switcher */}
        <Header
          user={user}
          demoUsers={demoUsers}
          onSwitchPersona={switchPersona}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onOpenIdCard={() => handleOpenStudentIdCard()}
          onNavigate={(tab) => setTab(tab)}
          theme={theme}
          setTheme={setTheme}
        />

        {/* Content Body */}
        <main className="main-content">
          {currentTab === 'dashboard' && (
            <DashboardPage 
              user={user} 
              setTab={setTab} 
              onOpenCopilot={() => setIsCopilotOpen(true)}
              onOpenIdCard={() => handleOpenStudentIdCard()}
            />
          )}

          {currentTab === 'workflows' && (
            <WorkflowsPage user={user} setTab={setTab} />
          )}

          {currentTab === 'admissions' && (
            <AdmissionsPage user={user} />
          )}

          {currentTab === 'students' && (
            <StudentsPage 
              user={user} 
              onOpenIdCardForStudent={handleOpenStudentIdCard}
            />
          )}

          {currentTab === 'faculty' && (
            <FacultyPage user={user} />
          )}

          {currentTab === 'attendance' && (
            <AttendancePage user={user} />
          )}

          {currentTab === 'academics' && (
            <AcademicsPage user={user} />
          )}

          {currentTab === 'examination' && (
            <ExaminationPage user={user} />
          )}

          {currentTab === 'assignments' && (
            <AssignmentsPage user={user} />
          )}

          {currentTab === 'finance' && (
            <FinancePage user={user} />
          )}

          {currentTab === 'library' && (
            <LibraryPage user={user} />
          )}

          {currentTab === 'placement' && (
            <PlacementPage user={user} />
          )}

          {currentTab === 'campus' && (
            <CampusOperationsPage user={user} />
          )}

          {currentTab === 'service-desk' && (
            <ServiceDeskPage user={user} />
          )}

          {currentTab === 'support' && (
            <SupportSystemPage user={user} />
          )}

          {currentTab === 'naac' && (
            <NaacPage user={user} />
          )}

          {currentTab === 'settings' && (
            <SettingsPage user={user} />
          )}
        </main>
      </div>

      {/* AI Campus Copilot Modal */}
      <AICopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        user={user}
        onNavigate={(tab) => setTab(tab)}
      />

      {/* Universal ERP Search Modal */}
      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Digital Campus Identity Card Modal */}
      <DigitalIdCardModal
        isOpen={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        student={cardStudent || user?.studentProfile}
        institution={institution}
      />
    </div>
  );
}
