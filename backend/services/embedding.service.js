// services/embedding.service.js
import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";
dotenv.config();

const KEY = process.env.COHERE_API_KEY;
if (!KEY) throw new Error("COHERE_API_KEY missing in .env");

const cohere = new CohereClient({ token: KEY });
const MODEL = "embed-english-v3.0"; // as used earlier

// safe embed with retry and batching
async function embedTexts(texts = [], input_type = "search_document", maxRetries = 3) {
    if (!Array.isArray(texts) || texts.length === 0) return [];

    const RETRY_DELAY = 800;
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const response = await cohere.embed({
                model: MODEL,
                texts,
                input_type,
            });
            if (!response || !response.embeddings) throw new Error("empty embed response");
            return response.embeddings;
        } catch (err) {
            attempt++;
            if (attempt > maxRetries) {
                throw new Error(`Embedding failed after ${maxRetries} attempts: ${err.message}`);
            }
            console.warn(`Embed attempt ${attempt} failed. Retrying in ${RETRY_DELAY}ms.`, err.message);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
    }
}

// batch helper to split large arrays into chunks
function batchArray(arr, size = 50) {
    const batches = [];
    for (let i = 0; i < arr.length; i += size) batches.push(arr.slice(i, i + size));
    return batches;
}

export { embedTexts, batchArray, cohere };
export default { embedTexts, batchArray, cohere };