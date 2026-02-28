// services/rewrite.service.js
import { generateContent } from "../config/gemini.js";
import { REWRITE_PROMPT } from "../utils/promptTemplates.js";

/**
 * Rewrites a follow-up (contextual) question into a standalone question.
 * - history: recent chat text (string)
 * - followUp: current user message
 * Returns the rewritten question (string). On failure returns original followUp.
 */
export async function rewriteQuestion(history, followUp, maxTokens = 200) {
    try {
        const prompt = REWRITE_PROMPT(history, followUp);
        const rewritten = await generateContent(prompt, { temperature: 0.0, maxOutputTokens: maxTokens });
        const cleaned = (rewritten || "").trim();
        if (!cleaned) return followUp;
        // Return a single-line question
        return cleaned.split("\n").join(" ").trim();
    } catch (err) {
        console.warn("rewriteQuestion failed, returning original:", err.message);
        return followUp;
    }
}