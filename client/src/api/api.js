import axios from 'axios';

const BASE_URL = '/api';

/**
 * Send a text message to the chat endpoint
 */
export async function sendMessage(sessionId, message) {
    const res = await axios.post(`${BASE_URL}/chat`, { sessionId, message });
    return res.data; // { answer, contexts }
}

/**
 * Send an audio blob to the voice pipeline.
 * Returns: { type: 'audio', blob } OR { type: 'text', answer, userText, contexts }
 */
export async function sendVoiceQuery(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
        const res = await axios.post(`${BASE_URL}/voice/voice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            responseType: 'blob',
        });

        const blob = res.data;
        // Check if it's actually JSON (text fallback) or real audio
        if (blob.type === 'application/json') {
            const text = await blob.text();
            const data = JSON.parse(text);
            return { type: 'text', ...data };
        }

        return { type: 'audio', blob };
    } catch (err) {
        // If response has JSON error body, parse it
        if (err.response?.data) {
            const blob = err.response.data;
            if (blob instanceof Blob) {
                const text = await blob.text();
                try {
                    const data = JSON.parse(text);
                    if (data.fallback) return { type: 'text', ...data };
                    throw new Error(data.error || 'Voice pipeline failed');
                } catch (parseErr) {
                    throw new Error(text || 'Voice pipeline failed');
                }
            }
        }
        throw err;
    }
}

/**
 * Check backend health
 */
export async function checkHealth() {
    const res = await axios.get(`${BASE_URL}/health`);
    return res.data;
}

/**
 * Get all chat sessions
 */
export async function getSessions() {
    const res = await axios.get(`${BASE_URL}/chat/sessions`);
    return res.data.sessions;
}

/**
 * Get full history for a session
 */
export async function getSessionHistory(sessionId) {
    const res = await axios.get(`${BASE_URL}/chat/history/${sessionId}`);
    return res.data.messages;
}
