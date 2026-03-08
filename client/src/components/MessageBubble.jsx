import React, { useState } from 'react';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

// Speak text aloud using browser TTS (Web Speech API)
export function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = message.contexts && message.contexts.length > 0;

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speakText(message.text);
    // Approximate reading time
    const words = message.text.split(' ').length;
    setTimeout(() => setIsSpeaking(false), Math.max(2000, words * 400));
  };

  return (
    <div className={`message-row ${isUser ? 'message-row--user' : 'message-row--assistant'}`}>
      {!isUser && (
        <div className="avatar avatar--assistant">
          <span>AI</span>
        </div>
      )}

      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--assistant'}`}>
        <p
          className="bubble-text"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
        />

        <div className="bubble-meta">
          <span className="bubble-time">{formatTime(message.timestamp)}</span>

          {/* TTS speak button for AI messages */}
          {!isUser && (
            <button
              className={`tts-btn ${isSpeaking ? 'tts-btn--speaking' : ''}`}
              onClick={handleSpeak}
              title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
            >
              {isSpeaking ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              )}
              <span>{isSpeaking ? 'Stop' : 'Read'}</span>
            </button>
          )}

          {hasSources && (
            <button
              className="sources-toggle"
              onClick={() => setShowSources((s) => !s)}
            >
              {showSources ? '▲ Hide' : '▼ Sources'} ({message.contexts.length})
            </button>
          )}
        </div>

        {showSources && hasSources && (
          <div className="sources-panel">
            <p className="sources-title">📚 Retrieved Context</p>
            {message.contexts.map((ctx, i) => {
              const meta = ctx.metadata || {};
              // Get all non-empty metadata keys
              const metaEntries = Object.entries(meta).filter(
                ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined'
              );
              const textKey = metaEntries.find(([k]) => ['text', 'content', 'chunk', 'passage'].includes(k.toLowerCase()));
              const displayEntries = metaEntries.filter(([k]) => !['text', 'content', 'chunk', 'passage'].includes(k.toLowerCase()));

              return (
                <div key={i} className="source-item">
                  <div className="source-score">
                    Score: {typeof ctx.score === 'number' ? ctx.score.toFixed(3) : 'N/A'}
                  </div>
                  {displayEntries.length > 0 && (
                    <div className="source-meta">
                      {displayEntries.slice(0, 6).map(([k, v]) => (
                        <span key={k} className="source-tag">
                          <strong>{k}:</strong> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                  {textKey && (
                    <p className="source-snippet">
                      "{String(textKey[1]).slice(0, 220)}..."
                    </p>
                  )}
                  {displayEntries.length === 0 && !textKey && (
                    <p className="source-snippet source-snippet--dim">
                      {JSON.stringify(meta).slice(0, 200)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="avatar avatar--user">
          <span>U</span>
        </div>
      )}
    </div>
  );
}
