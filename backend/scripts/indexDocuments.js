import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";

const CSV_PATH = path.resolve(process.cwd(), "data", "clean_groundwater_data.csv");

const NAMESPACE = "ingres-docs";
const MODEL = "embed-english-v3.0";

// ---- Clients ----


console.log("Cohere key:", process.env.COHERE_API_KEY);
console.log("Pinecone key:", process.env.PINECONE_API_KEY);
const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY,
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
const namespace = index.namespace(NAMESPACE);

// ---- Read CSV ----
function readCSV() {
    return new Promise((resolve) => {
        const rows = [];
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on("data", (data) => rows.push(data))
            .on("end", () => resolve(rows));
    });
}

function batchArray(array, batchSize = 50) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
}

async function indexDocuments() {
    try {
        console.log("📄 Loading CSV...");
        const rows = await readCSV();

        console.log("Total rows:", rows.length);

        // ---- Convert each row into structured text ----
        const documents = rows.map((row) => `
Taluka: ${row.block}
District: ${row.district}
Total Recharge: ${row.totalRecharge} Ham
Extractable Resource: ${row.extractableResource} Ham
Total Extraction: ${row.totalExtraction} Ham
Stage of Extraction: ${row.stage}%
Category: ${row.category}
        `.trim());

        const batches = batchArray(documents, 50);

        let totalUploaded = 0;

        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];

            const response = await cohere.embed({
                model: MODEL,
                texts: batch,
                input_type: "search_document",
            });

            const embeddings = response.embeddings;

            const records = embeddings.map((vector, i) => ({
                id: `taluka-${b}-${i}`,
                values: vector,
                metadata: {
                    text: batch[i],
                    source: "Maharashtra-GWRE-2024.csv",
                },
            }));

            await namespace.upsert(records);

            totalUploaded += records.length;

            console.log(
                `✅ Batch ${b + 1}/${batches.length} uploaded (${totalUploaded} total)`
            );
        }

        console.log("\n🚀 CSV Indexed Successfully!");
    } catch (error) {
        console.error("❌ Indexing Failed:", error.message);
    }
}

indexDocuments();