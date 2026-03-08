import fs from "fs";
import { speechToText } from "../services/stt.service.js";
import { runRAG } from "../services/rag.service.js";

/**
 * Handle full voice pipeline:
 * Voice → STT → RAG → Browser TTS (via JSON response)
 *
 * NOTE: ElevenLabs TTS is bypassed (402 quota exceeded).
 * The frontend's Web Speech API (browserSpeak) handles audio output.
 */
export async function handleVoiceQuery(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file uploaded" });
        }

        const audioPath = req.file.path;

        // 1️⃣ Speech to Text (Whisper)
        const userText = await speechToText(audioPath);

        // 2️⃣ Run RAG
        const ragResult = await runRAG(userText);

        // Clean up uploaded file
        try { fs.unlinkSync(audioPath); } catch (_) { }

        // 3️⃣ Return JSON — frontend uses browser Web Speech API for TTS
        return res.json({
            fallback: true,
            userText,
            answer: ragResult.answer,
            contexts: ragResult.contexts,
        });

    } catch (error) {
        console.error("Voice pipeline error:", error.message);
        res.status(500).json({ error: error.message });
    }
}