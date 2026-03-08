import React, { useEffect, useState } from 'react';
import { getSessions, getSessionHistory } from '../api/api';

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistorySidebar({ currentSessionId, onLoadSession, onNewChat }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = async () => {
    try {
      const data = await getSessions();
      setSessions(data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [currentSessionId]);

  const handleLoad = async (sessionId) => {
    try {
      const messages = await getSessionHistory(sessionId);
      // Convert DB messages to component format
      const formatted = messages.map((m, i) => ({
        id: `hist_${sessionId}_${i}`,
        role: m.role,
        text: m.content,
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
        contexts: m.metadata?.contexts || [],
      }));
      onLoadSession(sessionId, formatted);
      setIsOpen(false);
    } catch (_) {}
  };

  return (
    <>
      {/* Toggle button */}
      <button
        className="history-toggle"
        onClick={() => setIsOpen((o) => !o)}
        title="Chat History"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
        </svg>
        <span>History</span>
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="history-overlay" onClick={() => setIsOpen(false)}>
          <div className="history-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="history-header">
              <h3 className="history-title">💬 Chat History</h3>
              <div className="history-header-actions">
                <button className="btn-ghost btn-ghost--sm" onClick={() => { onNewChat(); setIsOpen(false); }}>
                  + New
                </button>
                <button className="history-close" onClick={() => setIsOpen(false)}>✕</button>
              </div>
            </div>

            <div className="history-list">
              {loading && <p className="history-empty">Loading…</p>}
              {!loading && sessions.length === 0 && (
                <p className="history-empty">No saved chats yet.</p>
              )}
              {sessions.map((s) => {
                const lastMsg = s.messages?.[0];
                const preview = lastMsg?.content?.slice(0, 60) || 'No messages';
                const isActive = s.sessionId === currentSessionId;
                return (
                  <button
                    key={s.sessionId}
                    className={`history-item ${isActive ? 'history-item--active' : ''}`}
                    onClick={() => handleLoad(s.sessionId)}
                  >
                    <div className="history-item-preview">{preview}…</div>
                    <div className="history-item-meta">
                      <span className="history-item-id">{s.sessionId.slice(0, 14)}</span>
                      <span className="history-item-time">{relativeTime(s.updatedAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
