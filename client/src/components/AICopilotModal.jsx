import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Database, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function AICopilotModal({ isOpen, onClose, user, onNavigate }) {
  if (!isOpen) return null;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello **${user?.full_name}**! I am your AI Campus Copilot, securely grounded in the Dr. APJ Abdul Kalam Institute of Technology database.\n\nAsk me anything regarding your attendance, fee balances, certificate requests, examination records, or academic schedules!`,
      sources: [{ type: 'Database', name: 'AIT Relational Schema' }],
      suggestedActions: []
    }
  ]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Suggested queries based on active role
  const studentSuggestions = [
    'Show my attendance for this semester',
    'What is my pending fee balance?',
    'What is the status of my certificate request?'
  ];

  const staffSuggestions = [
    'Which students have attendance below the required percentage?',
    'Summarize this department academic performance',
    'Draft a department notice for the next examination',
    'Institutional fee collection summary'
  ];

  const suggestions = user?.role === 'STUDENT' ? studentSuggestions : staffSuggestions;

  const handleSend = async (queryText) => {
    const promptToSend = queryText || input;
    if (!promptToSend.trim() || loading) return;

    const userMessage = { sender: 'user', text: promptToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.ai.askCopilot(promptToSend);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: res.response,
          sources: res.sources || [],
          suggestedActions: res.suggestedActions || [],
          requiresConfirmation: res.requiresConfirmation,
          pendingAction: res.pendingAction,
          securityViolation: res.securityViolation
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **Error retrieving information:** ${err.message}. Please try a different query or navigate using the side menu.`,
          sources: [],
          suggestedActions: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionId, confirmed) => {
    try {
      setLoading(true);
      const res = await api.ai.confirmAction(actionId, confirmed);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: confirmed
            ? `✅ **Action Confirmed and Executed:** ${res.message || 'Operation successfully completed.'}`
            : `❌ **Action Cancelled:** The pending operation has been cancelled.`,
          sources: [{ type: 'Confirmation Ledger', name: actionId }],
          suggestedActions: []
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **Action Execution Failed:** ${err.message}`,
          sources: [],
          suggestedActions: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '780px', height: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>AI Campus Copilot</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>
                Grounded Knowledge Assistant • Role-aware ({user?.role})
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}>
            <X size={18} />
          </button>
        </div>

        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                gap: '12px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '80%' : '95%'
              }}
            >
              {msg.sender === 'ai' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={18} color="var(--primary)" />
                </div>
              )}

              <div style={{
                background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '14px 18px',
                boxShadow: 'var(--shadow-xs)',
                fontSize: '0.9rem',
                lineHeight: 1.6
              }}>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: formatMarkdown(msg.text) 
                  }} 
                />

                {/* Consequential Action Confirmation Card */}
                {msg.requiresConfirmation && msg.pendingAction && (
                  <div style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '10px'
                  }}>
                    <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.82rem', marginBottom: '4px' }}>
                      ⚡ Consequential Action Requires Human Confirmation
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: '10px' }}>
                      {msg.pendingAction.summary}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                        onClick={() => handleConfirmAction(msg.pendingAction.actionId, true)}
                      >
                        <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
                        Confirm & Execute Action
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                        onClick={() => handleConfirmAction(msg.pendingAction.actionId, false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Sources Citation */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Database size={13} />
                    <span>Ground Truth Source: {msg.sources.map(s => s.name).join(', ')}</span>
                  </div>
                )}

                {/* Suggested Action Buttons */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {msg.suggestedActions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '20px' }}
                        onClick={() => {
                          onClose();
                          if (onNavigate) onNavigate(act.path.replace('/', ''));
                        }}
                      >
                        <span>{act.label}</span>
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--navy-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
                  <User size={18} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="var(--primary)" />
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Loader2 size={16} className="spin" color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Querying authorized institutional records...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Pills */}
        <div style={{ padding: '8px 20px', background: 'var(--bg-muted)', display: 'flex', gap: '8px', overflowX: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
          {suggestions.map((sug, sIdx) => (
            <button
              key={sIdx}
              onClick={() => handleSend(sug)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              💡 {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', background: 'var(--bg-surface)' }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Ask a question about attendance, fees, schedules, or drafts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{ borderRadius: '24px', padding: '10px 18px' }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ borderRadius: '24px', padding: '10px 20px', flexShrink: 0 }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// Lightweight Markdown to HTML formatting helper
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h4 style="margin: 8px 0 4px; font-weight:700;">$1</h4>')
    .replace(/^#### (.*$)/gim, '<h5 style="margin: 6px 0 2px; font-weight:600;">$1</h5>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
    .replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #2563eb; padding-left: 10px; margin: 8px 0; color: #475569;">$1</blockquote>')
    .replace(/\n\n/g, '<br/>')
    .replace(/\n/g, '<br/>');
}
