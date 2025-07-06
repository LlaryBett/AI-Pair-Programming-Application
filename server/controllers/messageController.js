import { Message } from "../models/Message.js";
import axios from "axios";

export const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find().populate("user", "name email avatar");
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

export const postMessage = async (req, res, next) => {
  try {
    const { user, content, type } = req.body;
    const message = await Message.create({ user, content, type });

    // If user message, generate AI response using Grok/Llama
    if (type === "user") {
      // Call Grok/Llama API (replace with your actual endpoint and payload)
      const aiRes = await axios.post(
        process.env.GROK_API_URL,
        {
          prompt: content,
          // ...other params as required by your Grok/Llama API...
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROK_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      // Adjust the following line based on Grok/Llama API response structure
      const aiContent = aiRes.data?.result || aiRes.data?.choices?.[0]?.text || "Sorry, I couldn't generate a response.";
      const aiMessage = await Message.create({
        user: null,
        content: aiContent,
        type: "ai"
      });
      res.status(201).json([message, aiMessage]);
    } else {
      res.status(201).json(message);
    }
  } catch (err) {
    next(err);
  }
};
