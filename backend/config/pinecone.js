// config/pinecone.js

import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

let pineconeInstance = null;
let pineconeIndex = null;

export function connectPinecone() {
    if (!process.env.PINECONE_API_KEY) {
        throw new Error(" PINECONE_API_KEY missing in .env");
    }

    if (!process.env.PINECONE_INDEX_NAME) {
        throw new Error("PINECONE_INDEX_NAME missing in .env");
    }

    pineconeInstance = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });

    pineconeIndex = pineconeInstance.Index(
        process.env.PINECONE_INDEX_NAME
    );

    console.log("Pinecone connected");
}

export function getPineconeIndex() {
    if (!pineconeIndex) {
        throw new Error("Pinecone not initialized. Call connectPinecone() first.");
    }

    return pineconeIndex;
}