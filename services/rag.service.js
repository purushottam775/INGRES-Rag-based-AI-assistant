// services/rag.service.js
import { searchByText, searchPineconeByEmbedding } from "./retrieval.service.js";
import { embedTexts } from "./embedding.service.js";
import { generateContent } from "../config/gemini.js";
import { RAG_PROMPT } from "../utils/promptTemplates.js";

/**
 * Runs RAG:
 * 1) Accepts a standalone question (rewritten),
 * 2) Optionally accepts metadataFilter (e.g. { block: "Rahuri" }),
 * 3) Searches pinecone and builds prompt,
 * 4) Calls LLM to answer with strict instructions,
 * 5) Returns { answer, usedContexts }
 */
export async function runRAG(question, options = {}) {
    const topK = options.topK ?? 4;
    const filter = options.filter ?? null;

    try {
        // 1) get embedding for query
        const queryEmbedding = (await embedTexts([question], "search_query"))[0];
        if (!queryEmbedding) throw new Error("Failed to get query embedding");

        // 2) search pinecone (hybrid)
        const matches = await searchPineconeByEmbedding(queryEmbedding, topK, filter);

        // 3) Build context items (choose top matches)
        const contexts = matches.map(m => ({ score: m.score, metadata: m.metadata }));

        // 4) Build prompt and call LLM
        const prompt = RAG_PROMPT(contexts, question);
        const answer = await generateContent(prompt, { temperature: 0.0, maxOutputTokens: 400 });

        // 5) If the answer is "Data not available..." or no contexts, handle fallback
        const resultText = (answer || "").trim();

        return {
            answer: resultText,
            contexts,
        };
    } catch (err) {
        console.error("runRAG error:", err.message);
        // graceful fallback
        return {
            answer: "Sorry — I couldn't retrieve the data right now. Try rephrasing or ask for another taluka.",
            contexts: []
        };
    }
}