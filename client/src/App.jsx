import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import VoiceControls from './components/VoiceControls';
import HistorySidebar from './components/HistorySidebar';
import { useChat } from './hooks/useChat';
import './index.css';

export default function App() {
  const { messages, isLoading, chat, addVoiceExchange, loadSession, clearChat, sessionId } = useChat();
  const [voiceText, setVoiceText] = useState('');

  const handleTranscript = useCallback((text) => setVoiceText(text), []);
  const clearVoiceText = useCallback(() => setVoiceText(''), []);

  // Called when voice pipeline returns a result (audio OR text fallback)
  const handleVoiceAnswer = useCallback(({ userText, answer, contexts, type }) => {
    if (type === 'text' && (userText || answer)) {
      addVoiceExchange(userText, answer, contexts);
    }
    // type === 'audio' is handled by the audio player inside VoiceControls
  }, [addVoiceExchange]);

  return (
    <div className="app">
      <Navbar onClear={clearChat} />

      <main className="chat-page">
        <div className="chat-container">
          <ChatWindow messages={messages} isLoading={isLoading} />

          <div className="chat-bottom">
            <div className="chat-bottom-toolbar">
              <VoiceControls
                onTranscript={handleTranscript}
                onVoiceAnswer={handleVoiceAnswer}
                isLoading={isLoading}
              />
              <HistorySidebar
                currentSessionId={sessionId}
                onLoadSession={loadSession}
                onNewChat={clearChat}
              />
            </div>

            <ChatInput
              onSend={chat}
              isLoading={isLoading}
              voiceText={voiceText}
              onVoiceTextClear={clearVoiceText}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}