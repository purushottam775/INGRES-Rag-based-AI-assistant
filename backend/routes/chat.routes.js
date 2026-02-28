// routes/chat.routes.js

import express from "express";
import { chatHandler } from "../controllers/chat.controller.js";
import Chat from "../models/chat.model.js";

const router = express.Router();

/**
 * POST /api/chat
 * Body: { sessionId, message }
 */
router.post("/", chatHandler);

/**
 * GET /api/chat/sessions
 * Returns list of all sessions (for sidebar)
 */
router.get("/sessions", async (req, res) => {
    try {
        const sessions = await Chat.find({}, { sessionId: 1, updatedAt: 1, "messages": { $slice: -1 } })
            .sort({ updatedAt: -1 })
            .limit(30)
            .lean();
        res.json({ sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/chat/history/:sessionId
 * Returns full message history for a session
 */
router.get("/history/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const chat = await Chat.findOne({ sessionId }).lean();
        if (!chat) return res.json({ messages: [] });
        res.json({ messages: chat.messages, sessionId: chat.sessionId, updatedAt: chat.updatedAt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/chat/health
 */
router.get("/health", (req, res) => {
    res.json({ success: true, message: "Chat service running" });
});

export default router;