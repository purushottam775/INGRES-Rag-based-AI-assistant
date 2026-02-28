// controllers/chat.controller.js
import { getRecentHistoryText, appendMessage } from "../services/history.service.js";
import { rewriteQuestion } from "../services/rewrite.service.js";
import { runRAG } from "../services/rag.service.js";

export async function chatHandler(req, res) {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    // 1. get recent chat history text
    const historyText = await getRecentHistoryText(sessionId, 8);

    // 2. rewrite follow-up to standalone
    const rewritten = await rewriteQuestion(historyText, message);

    // 3. append user message with rewritten metadata
    await appendMessage(sessionId, "user", message, { rewrittenQuestion: rewritten });

    // 4. Try to detect a direct metadata filter (simple heuristic)
    // If user explicitly mentions a taluka/district name, we can set filter to improve retrieval.
    let filter = null;
    const lower = rewritten.toLowerCase();
    const blockMatch = (rewritten.match(/taluka[: ]*([\w\s-]+)/i) || rewritten.match(/in ([\w\s-]+) taluka/i));
    if (blockMatch && blockMatch[1]) {
        filter = { block: { $eq: blockMatch[1].trim() } }; // adjust to Pinecone filter syntax if needed
    }

    // 5. Run RAG
    const { answer, contexts } = await runRAG(rewritten, { filter });

    // 6. Save assistant message and metadata
    await appendMessage(sessionId, "assistant", answer, { metadata: { contexts } });

    return res.json({ answer, contexts });
}