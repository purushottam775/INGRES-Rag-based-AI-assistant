import React, { useEffect, useState } from 'react';
import { checkHealth } from '../api/api';

export default function Navbar({ onClear }) {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">INGRES</span>
        </div>
        <span className="logo-subtitle">Intelligent Ground Resource Expert System</span>
      </div>

      <div className="navbar-actions">
        <div className="status-indicator">
          <span
            className={`status-dot ${online === null ? 'status-checking' : online ? 'status-online' : 'status-offline'}`}
          ></span>
          <span className="status-text">
            {online === null ? 'Checking...' : online ? 'Backend Online' : 'Offline'}
          </span>
        </div>
        <button className="btn-ghost" onClick={onClear} title="Clear conversation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 .49-3.51"></path>
          </svg>
          <span>New Chat</span>
        </button>
      </div>
    </nav>
  );
}
