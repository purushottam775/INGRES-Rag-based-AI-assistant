import { generateContent } from "./gemini.js";

const res = await generateContent("Explain AI in simple words");
console.log(res);