import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AICopilotModal from './components/AICopilotModal';
import UniversalSearchModal from './components/UniversalSearchModal';
import DigitalIdCardModal from './components/DigitalIdCardModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import FacultyPage from './pages/FacultyPage';
import AttendancePage from './pages/AttendancePage';
import AcademicsPage from './pages/AcademicsPage';
import ExaminationPage from './pages/ExaminationPage';
import FinancePage from './pages/FinancePage';
import LibraryPage from './pages/LibraryPage';
import PlacementPage from './pages/PlacementPage';
import ServiceDeskPage from './pages/ServiceDeskPage';
import SupportSystemPage from './pages/SupportSystemPage';
import NaacPage from './pages/NaacPage';
import SettingsPage from './pages/SettingsPage';

import { api } from './services/api';
import { GraduationCap, Shield, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('erp_theme') || 'light');
  const [user, setUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
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
      const demoRes = await api.auth.getDemoUsers();
      setDemoUsers(demoRes.demoUsers || []);

      // 2. Fetch institution configuration
      const instRes = await api.institution.get();
      setInstitution(instRes.institution);

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
      console.error('App init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchPersona = async (username) => {
    try {
      const res = await api.auth.switchDemo(username);
      localStorage.setItem('erp_token', res.token);
      setUser(res.user);

      // If switching to student, set card data
      if (res.user.studentProfile) {
        setCardStudent(res.user.studentProfile);
      }
    } catch (err) {
      console.error('Switch persona error:', err);
    }
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
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 4px 20px rgba(37,99,235,0.5)' }}>
          <GraduationCap size={32} color="white" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Dr. APJ Abdul Kalam Institute of Technology</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Loading Unified College ERP System...</p>
      </div>
    );
  }

  // Fallback Login Screen if user explicitly logged out
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '680px', width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(37,99,235,0.4)' }}>
              <GraduationCap size={32} color="white" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>AIT Pune College ERP</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
              "One Campus. One Platform. Smarter Education." • Select Demo Persona to Sign In:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {demoUsers.map(u => (
              <button
                key={u.username}
                onClick={() => switchPersona(u.username)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.2)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>
                  {u.label}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '2px' }}>{u.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{u.dept}</div>
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

          {currentTab === 'finance' && (
            <FinancePage user={user} />
          )}

          {currentTab === 'library' && (
            <LibraryPage user={user} />
          )}

          {currentTab === 'placement' && (
            <PlacementPage user={user} />
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
