import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import http from "http";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { invitationRoutes } from "./routes/invitations.js";
import { collaborationRoutes } from "./routes/collaborationRoutes.js";
import aiChatRoutes from "./routes/aiRoutes.js";
import documentRoutes from "./routes/documents.js"; // ✅ FIX: use full document router
import { errorHandler } from "./middleware/errorHandler.js";

import { initializeSocket } from "./socket.js";

dotenv.config();

const startServer = async () => {
  try {
    await connectDB(); // ✅ Wait for DB connection

    const app = express();
    const server = http.createServer(app);
    const { io, socketManager } = initializeSocket(server); // ⬅️ Socket initialized

    // Middleware
    app.use(express.json());
    app.use(cors());
    

    // Attach socket instance to every request (useful in controllers)
    app.use((req, res, next) => {
      req.io = io;
      req.socketManager = socketManager;
      next();
    });

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/invitations", invitationRoutes);
    app.use("/api", collaborationRoutes);
    app.use("/api/ai-chat", aiChatRoutes);
    app.use("/api/documents", documentRoutes); // ✅ FIX: full route with auth included

    // Global error handler
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log("AI Chat Endpoints:");
      console.log("• POST /api/ai-chat/chat");
      console.log("• POST /api/ai-chat/chat/stream");
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
