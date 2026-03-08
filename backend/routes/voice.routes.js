import express from "express";
import multer from "multer";
import path from "path";
import { handleVoiceQuery } from "../controllers/voice.controller.js";

const router = express.Router();

// 🔥 FIX: Preserve file extension
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || ".webm";
        cb(null, Date.now() + ext);
    },
});

const upload = multer({
    storage,
});

router.post("/voice", upload.single("audio"), handleVoiceQuery);

export default router;