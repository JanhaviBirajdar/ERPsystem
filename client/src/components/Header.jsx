import React, { useState } from 'react';
import { Search, Sparkles, Moon, Sun, Bell, CreditCard, Shield } from 'lucide-react';

export default function Header({ 
  user, 
  demoUsers, 
  onSwitchPersona, 
  onOpenSearch, 
  onOpenCopilot, 
  onOpenIdCard,
  theme, 
  setTheme 
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Mid-Term Exam Schedule Published',
      message: 'Autonomous semester examination timetable has been finalized for all departments.',
      time: '10 mins ago',
      category: 'Exam',
      priority: 'urgent',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Fee Payment Installment Deadline',
      message: 'Second installment deadline for Academic Year 2025-26 ends on 30th October.',
      time: '1 hour ago',
      category: 'Finance',
      priority: 'urgent',
      read: false
    },
    {
      id: 'notif-3',
      title: 'NAAC SSR Documentation Review',
      message: 'Criterion 2 teaching-learning verification scheduled tomorrow at 11:00 AM.',
      time: '3 hours ago',
      category: 'Academic',
      priority: 'normal',
      read: false
    },
    {
      id: 'notif-4',
      title: 'Placement Drive: Tata Elxsi',
      message: 'Shortlisted candidates for round 2 technical interviews updated on the portal.',
      time: 'Yesterday',
      category: 'Placement',
      priority: 'normal',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markItemRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <header className="app-header">
      {/* Search Bar */}
      <div className="header-left">
        <div className="search-box" onClick={onOpenSearch} style={{ cursor: 'pointer' }}>
          <Search size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Search students, faculty, courses (Ctrl+K)...
          </span>
          <span className="search-shortcut">⌘K</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="header-right">
        {/* Instant Persona Switcher - Crucial for evaluating role dashboards */}
        <div className="persona-selector" title="Switch active role persona instantly">
          <Shield size={14} />
          <span className="persona-label">Persona:</span>
          <select 
            className="persona-select"
            value={user?.username || ''}
            onChange={(e) => onSwitchPersona(e.target.value)}
          >
            {demoUsers.map(u => (
              <option key={u.username} value={u.username}>
                {u.label} - {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Digital ID Card for Student View */}
        {user?.role === 'STUDENT' && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onOpenIdCard}
            style={{ borderColor: 'var(--primary-border)', color: 'var(--primary)', fontWeight: 600 }}
          >
            <CreditCard size={15} />
            <span>Digital Campus ID</span>
          </button>
        )}

        {/* AI Copilot Quick Launcher */}
        <button 
          className="btn btn-primary btn-sm"
          onClick={onOpenCopilot}
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none' }}
        >
          <Sparkles size={15} />
          <span>Ask AI Copilot</span>
        </button>

        {/* Notifications Area */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            title="Campus Notifications & Circulars"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--header-bg, #ffffff)'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: '360px',
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '14px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--table-header-bg, #f8fafc)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="var(--primary, #2563eb)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>
                    Campus Notifications
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    {unreadCount} New
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--primary, #2563eb)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                    No notifications at this time
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markItemRead(n.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        backgroundColor: n.read ? 'transparent' : 'rgba(37, 99, 235, 0.04)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--row-hover-bg, rgba(37, 99, 235, 0.08))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(37, 99, 235, 0.04)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.85rem', color: 'var(--text-primary, #0f172a)' }}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0, marginTop: '5px' }} />
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.4 }}>
                        {n.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)' }}>{n.time}</span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: n.priority === 'urgent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            color: n.priority === 'urgent' ? '#dc2626' : '#475569'
                          }}
                        >
                          {n.category}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle */}
        <button 
          className="icon-btn" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User Profile Badge */}
        <div className="user-badge" onClick={onOpenIdCard}>
          <img 
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
            alt="Avatar" 
            className="user-avatar"
          />
          <div className="user-info">
            <span className="user-name">{user?.full_name?.split(' ')[0]}</span>
            <span className="user-role-tag">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

