// services/history.service.js
import Chat from "../models/chat.model.js";

/**
 * Load or create session
 */
export async function loadOrCreateSession(sessionId) {
    if (!sessionId) throw new Error("sessionId required");
    let chat = await Chat.findOne({ sessionId });
    if (!chat) {
        chat = await Chat.create({ sessionId, messages: [] });
    }
    return chat;
}

/**
 * Append a message
 */
export async function appendMessage(sessionId, role, content, extra = {}) {
    const chat = await loadOrCreateSession(sessionId);
    chat.messages.push({
        role,
        content,
        ...("rewrittenQuestion" in extra ? { rewrittenQuestion: extra.rewrittenQuestion } : {}),
        metadata: extra.metadata ?? undefined,
    });
    await chat.save();
    return chat;
}

/**
 * Get last N messages as plain text (used for rewrite prompt)
 */
export async function getRecentHistoryText(sessionId, limit = 8) {
    const chat = await Chat.findOne({ sessionId });
    if (!chat || !chat.messages || chat.messages.length === 0) return "";
    const messages = chat.messages.slice(-limit);
    const text = messages.map(m => `${m.role}: ${m.content}`).join("\n");
    return text;
}