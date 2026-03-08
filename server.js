// server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import { connectPinecone, getPineconeIndex } from "./config/pinecone.js";

import chatRoutes from "./routes/chat.routes.js";
import voiceRoutes from "./routes/voice.routes.js";

dotenv.config();

const app = express();

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// Connect Services
// --------------------
await connectDB();

// Just initialize Pinecone once
await connectPinecone();

console.log("Pinecone initialized");

// --------------------
// Routes
// --------------------

// Root
app.get("/", (req, res) => {
    res.send(" INGRES Backend Running");
});

// Chat routes
app.use("/api/chat", chatRoutes);

// Voice routes
app.use("/api/voice", voiceRoutes);

// Health route
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server healthy",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});