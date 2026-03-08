import React, { useState, useRef } from 'react';

export default function ChatInput({ onSend, isLoading, voiceText, onVoiceTextClear }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // When voiceText is set from STT, fill the input
  React.useEffect(() => {
    if (voiceText) {
      setText((prev) => prev ? prev + ' ' + voiceText : voiceText);
      onVoiceTextClear?.();
      textareaRef.current?.focus();
    }
  }, [voiceText, onVoiceTextClear]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
    textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="chat-input-bar">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Ask about groundwater, recharge, talukas... (Enter to send)"
          value={text}
          onInput={handleInput}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <div className="chat-input-actions">
          <span className="char-count">{text.length}</span>
          <button
            className={`btn-send ${isLoading ? 'btn-send--loading' : ''}`}
            onClick={handleSend}
            disabled={isLoading || !text.trim()}
            title="Send message"
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
      <p className="input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</p>
    </div>
  );
}
