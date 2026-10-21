import React from 'react';
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
