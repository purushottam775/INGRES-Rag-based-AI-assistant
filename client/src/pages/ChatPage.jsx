import React, { useState, useCallback } from 'react';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import VoiceControls from '../components/VoiceControls';
import { useChat } from '../hooks/useChat';

export default function ChatPage() {
  const { messages, isLoading, chat } = useChat();
  const [voiceText, setVoiceText] = useState('');

  const handleTranscript = useCallback((text) => {
    setVoiceText(text);
  }, []);

  const clearVoiceText = useCallback(() => setVoiceText(''), []);

  return (
    <main className="chat-page">
      <div className="chat-container">
        <ChatWindow messages={messages} isLoading={isLoading} />
        <div className="chat-bottom">
          <VoiceControls
            onTranscript={handleTranscript}
            isLoading={isLoading}
          />
          <ChatInput
            onSend={chat}
            isLoading={isLoading}
            voiceText={voiceText}
            onVoiceTextClear={clearVoiceText}
          />
        </div>
      </div>
    </main>
  );
}
