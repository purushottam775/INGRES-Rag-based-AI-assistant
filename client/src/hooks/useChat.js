import { useState, useRef, useCallback } from 'react';
import { sendMessage } from '../api/api';

const genSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const WELCOME = () => ({
    id: 'welcome',
    role: 'assistant',
    text: '👋 Hello! I\'m **INGRES** — your Intelligent Ground Resource Expert. Ask me anything about groundwater, recharge data, talukas, or irrigation.',
    timestamp: new Date(),
    contexts: [],
});

export function useChat() {
    const [messages, setMessages] = useState([WELCOME()]);
    const [isLoading, setIsLoading] = useState(false);
    const sessionId = useRef(genSessionId());

    const addMessage = useCallback((role, text, contexts = []) => {
        const msg = { id: `${role}_${Date.now()}`, role, text, timestamp: new Date(), contexts };
        setMessages((prev) => [...prev, msg]);
        return msg;
    }, []);

    /** Send a text message */
    const chat = useCallback(async (userText) => {
        if (!userText.trim()) return;
        addMessage('user', userText);
        setIsLoading(true);
        try {
            const { answer, contexts } = await sendMessage(sessionId.current, userText);
            addMessage('assistant', answer, contexts || []);
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'Something went wrong.';
            addMessage('assistant', `❌ ${msg}`);
        } finally {
            setIsLoading(false);
        }
    }, [addMessage]);

    /** Insert a voice answer (user question + AI response) as chat messages */
    const addVoiceExchange = useCallback((userText, answer, contexts = []) => {
        if (userText) addMessage('user', `🎤 ${userText}`);
        if (answer) addMessage('assistant', answer, contexts);
    }, [addMessage]);

    /** Load an existing session from DB history */
    const loadSession = useCallback((newSessionId, historyMessages) => {
        sessionId.current = newSessionId;
        setMessages(historyMessages.length ? historyMessages : [WELCOME()]);
    }, []);

    /** Start a fresh session */
    const clearChat = useCallback(() => {
        sessionId.current = genSessionId();
        setMessages([WELCOME()]);
    }, []);

    return {
        messages,
        isLoading,
        chat,
        addVoiceExchange,
        loadSession,
        clearChat,
        sessionId: sessionId.current,
    };
}
