// models/chat.model.js

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant", "system"],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        rewrittenQuestion: {
            type: String, // used when query rewriting is applied
        },
        metadata: {
            type: Object, // can store stage, block, retrieval info etc.
        },
    },
    {
        timestamps: true,
    }
);

const chatSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: String, // optional (if login system added later)
        },
        messages: [messageSchema],
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Chat", chatSchema);