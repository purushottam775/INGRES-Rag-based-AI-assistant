import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Convert user voice to text
 * @param {string} filePath - path to uploaded audio file
 * @returns {string} transcribed text
 */
export async function speechToText(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error("Audio file not found");
        }

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            response_format: "verbose_json", // better detection
        });

        if (!transcription.text) {
            throw new Error("No transcription returned");
        }

        console.log("🎤 Transcribed Text:", transcription.text);

        return transcription.text.trim();
    } catch (error) {
        console.error("❌ STT Error:", error.message);
        throw new Error("Speech to text failed");
    }
}