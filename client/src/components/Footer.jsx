import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-left">
          <span className="footer-logo">⚡ INGRES</span>
          <span className="footer-copy">© 2026 Intelligent Ground Resource Expert System</span>
        </div>
        <div className="footer-badges">
          <span className="badge">Gemini AI</span>
          <span className="badge">Pinecone RAG</span>
          <span className="badge">Groq Whisper</span>
          <span className="badge">ElevenLabs TTS</span>
        </div>
      </div>
    </footer>
  );
}
