import express from "express";
import {
  getAIResponse,
  streamAIResponse,
  patchMessage,
  getChatMessages,
  saveAIChatMessage
} from "../controllers/aiController.js";
import { auth } from "../middleware/auth.js";
import { validatePrompt } from "../middleware/validatePrompt.js";

const router = express.Router();

// Standard AI response
router.post("/chat", auth, validatePrompt, getAIResponse);

// Streaming response
router.post("/chat/stream", auth, validatePrompt, streamAIResponse);

// Get chat history
router.get("/messages", auth, getChatMessages);

// PATCH feedback/update
router.patch("/messages/:messageId", auth, patchMessage);

// POST manual message save
router.post("/messages", auth, saveAIChatMessage);

// ✅ Only ONE default export
export default router;
