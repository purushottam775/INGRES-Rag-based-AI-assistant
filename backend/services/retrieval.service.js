import { getPineconeIndex } from "../config/pinecone.js";
import { embedTexts } from "./embedding.service.js";

const NAMESPACE = "ingres-docs";

export async function searchPineconeByEmbedding(vector, topK = 5, filter = null) {
    try {
        const index = getPineconeIndex();

        // 🔥 THIS IS THE CORRECT WAY IN v5
        const namespace = index.namespace(NAMESPACE);

        const queryBody = {
            vector,
            topK,
            includeMetadata: true,
            includeValues: false,
        };

        if (filter) {
            queryBody.filter = filter;
        }

        const result = await namespace.query(queryBody);

        console.log("Matches found:", result.matches?.length);

        return (result.matches || []).map((match) => ({
            score: match.score,
            metadata: match.metadata,
        }));
    } catch (error) {
        console.error("Pinecone query error:", error.message);
        throw error;
    }
}

export async function searchByText(queryText, topK = 5, filter = null) {
    const embeddings = await embedTexts([queryText], "search_query");
    const vector = embeddings[0];

    if (!vector) return [];

    return await searchPineconeByEmbedding(vector, topK, filter);
}