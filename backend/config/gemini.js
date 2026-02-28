// config/gemini.js  (Now using Groq properly)

import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
    path: path.resolve(process.cwd(), ".env"),
});

if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY missing in .env");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generic text generation function
 */
export async function generateContent(prompt, options = {}) {
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",  //Updated working model
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxOutputTokens ?? 512,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Groq Error:", error.message);
        throw new Error("LLM generation failed");
    }
}