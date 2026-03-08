import React, { useState, useRef, useEffect } from 'react';
import { sendVoiceQuery } from '../api/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

// Browser TTS helper
function browserSpeak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/<[^>]+>/g, '').slice(0, 800);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'en-IN';
  utt.rate = 0.95;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

export default function VoiceControls({ onTranscript, onVoiceAnswer, isLoading }) {
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useVoiceRecorder();
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const [isPipelineLoading, setIsPipelineLoading] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [audioSrc, setAudioSrc] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  // ── Browser STT ──────────────────────────────────────────
  const startBrowserSTT = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceError('Browser STT not supported. Use Chrome/Edge.'); return; }
    setVoiceError('');
    const recog = new SR();
    recog.lang = 'en-IN';
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = (e) => { onTranscript?.(e.results[0][0].transcript); setIsSpeechListening(false); };
    recog.onerror = (e) => { setVoiceError('STT error: ' + e.error); setIsSpeechListening(false); };
    recog.onend = () => setIsSpeechListening(false);
    recog.start();
    recognitionRef.current = recog;
    setIsSpeechListening(true);
  };

  const stopBrowserSTT = () => { recognitionRef.current?.stop(); setIsSpeechListening(false); };

  // ── Server Voice Pipeline ────────────────────────────────
  const handleToggleRecording = () => {
    if (isRecording) { stopRecording(); }
    else { setAudioSrc(null); setVoiceError(''); setPipelineStatus(''); startRecording(); }
  };

  useEffect(() => {
    if (!audioBlob) return;
    (async () => {
      try {
        setIsPipelineLoading(true);
        setPipelineStatus('🎙️ Transcribing with Whisper…');
        setVoiceError('');

        const result = await sendVoiceQuery(audioBlob);
        clearAudio();

        if (result.type === 'audio') {
          // ElevenLabs TTS worked — play the mp3
          const url = URL.createObjectURL(result.blob);
          setAudioSrc(url);
          setPipelineStatus('✅ Playing ElevenLabs voice response');
          onVoiceAnswer?.({ userText: '', answer: '', type: 'audio' });
        } else {
          // Fallback: ElevenLabs failed (402/other) — use browser TTS
          setPipelineStatus('🔊 Speaking with browser voice (ElevenLabs unavailable)…');
          // Inject as chat message
          onVoiceAnswer?.({ userText: result.userText, answer: result.answer, contexts: result.contexts, type: 'text' });
          setIsSpeaking(true);
          browserSpeak(result.answer, () => {
            setIsSpeaking(false);
            setPipelineStatus('✅ Voice query answered');
          });
        }
      } catch (err) {
        let msg = err.message || 'Voice pipeline failed.';
        setVoiceError('❌ ' + msg);
        setPipelineStatus('');
      } finally {
        setIsPipelineLoading(false);
      }
    })();
  }, [audioBlob]);

  return (
    <div className="voice-controls">
      <div className="voice-row">
        {/* Browser STT */}
        <button
          className={`voice-btn voice-btn--stt ${isSpeechListening ? 'voice-btn--active' : ''}`}
          onClick={isSpeechListening ? stopBrowserSTT : startBrowserSTT}
          disabled={isLoading || isPipelineLoading || isRecording}
          title="Speak to fill input (Chrome/Edge)"
        >
          {isSpeechListening ? (
            <><span className="pulse-ring"></span>
              <MicIcon /><span>Listening… tap to stop</span></>
          ) : (
            <><MicIcon /><span>Speak to Input</span></>
          )}
        </button>

        {/* Server Voice Pipeline */}
        <button
          className={`voice-btn voice-btn--pipeline ${isRecording ? 'voice-btn--recording' : ''}`}
          onClick={handleToggleRecording}
          disabled={isLoading || isSpeechListening || isPipelineLoading}
          title="Record → AI answers out loud"
        >
          {isPipelineLoading ? (
            <><div className="spinner spinner--sm" /><span>Processing…</span></>
          ) : isRecording ? (
            <><span className="pulse-ring pulse-ring--red"></span>
              <StopIcon /><span>Stop &amp; Send</span></>
          ) : (
            <><WaveIcon /><span>Voice Query</span></>
          )}
        </button>

        {/* Stop browser speaking */}
        {isSpeaking && (
          <button
            className="voice-btn voice-btn--stop-speak"
            onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); setPipelineStatus(''); }}
          >
            <StopIcon /><span>Stop Speaking</span>
          </button>
        )}
      </div>

      {pipelineStatus && !voiceError && (
        <p className="voice-status">{pipelineStatus}</p>
      )}

      {voiceError && (
        <div className="voice-error-box">
          <p className="voice-error">{voiceError}</p>
          <button className="voice-error-dismiss" onClick={() => setVoiceError('')}>✕</button>
        </div>
      )}

      {audioSrc && (
        <div className="audio-player">
          <span className="audio-label">🔊 AI Voice</span>
          <audio src={audioSrc} controls autoPlay className="audio-element"
            onEnded={() => setPipelineStatus('')} />
          <button className="audio-close"
            onClick={() => { setAudioSrc(null); setPipelineStatus(''); }}>✕</button>
        </div>
      )}
    </div>
  );
}

// Simple inline SVG icons
const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);
const WaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);
