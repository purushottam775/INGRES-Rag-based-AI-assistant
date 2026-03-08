import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Convert AI text response to voice
 * @param {string} text
 * @returns {Buffer} audio buffer
 */
export async function textToSpeech(text) {
    try {
        if (!text) {
            throw new Error("No text provided for TTS");
        }

        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
            {
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.6,
                    similarity_boost: 0.7,
                },
            },
            {
                headers: {
                    "xi-api-key": process.env.ELEVEN_API_KEY,
                    "Content-Type": "application/json",
                },
                responseType: "arraybuffer",
            }
        );

        return response.data;
    } catch (error) {
        console.error("❌ TTS Error:", error.message);
        throw new Error("Text to speech failed");
    }
}