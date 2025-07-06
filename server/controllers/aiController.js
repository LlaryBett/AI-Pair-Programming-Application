import Message from "../models/Message.js";
import AIChatMessage from "../models/AIChat.js";
import Document from "../models/Document.js";
import aiService from "../services/aiService.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

// Helper: Process AI call and metadata
const processAICall = async (prompt, isStream = false) => {
  const startTime = Date.now();
  
  const result = isStream
    ? await aiService.getCompletionStream(prompt)
    : await aiService.getCompletion(prompt);

  return {
    result,
    metadata: {
      processingTime: Date.now() - startTime
    }
  };
};

// Standard response endpoint
export const getAIResponse = async (req, res) => {
  try {
    const { prompt, documentId } = req.body;
    const userId = req.user?.id;

    // Verify document access if documentId is provided
    if (documentId) {
      const document = await Document.findOne({
        _id: new ObjectId(documentId),
        $or: [
          { owner: new ObjectId(userId) },
          { "collaborators.user": new ObjectId(userId) },
          { isPublic: true } // Add public access
        ]
      });

      console.log('Document access check:', {
        documentId,
        userId,
        document: document ? 'found' : 'not found',
        owner: document?.owner?.toString(),
        collaborators: document?.collaborators?.length || 0
      });

      if (!document) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized document access',
          debug: {
            documentId,
            userId,
            userIdType: typeof userId,
            documentIdType: typeof documentId
          }
        });
      }
    }

    const { result: aiResponse, metadata } = await processAICall(prompt);

    // Save to both message collections
    const [message, aiChatMessage] = await Promise.all([
      Message.create({
        prompt,
        response: {
          content: aiResponse.content,
          tokens: aiResponse.tokens
        },
        user: userId || null,
        metadata,
        isStreamed: false
      }),
      documentId ? AIChatMessage.create({
        documentId,
        userId,
        content: aiResponse.content,
        type: 'ai',
        metadata: {
          tokens: aiResponse.tokens,
          messageId: aiResponse.id,
          suggestedCode: aiResponse.suggestedCode
        }
      }) : null
    ]);

    // Socket.io notification
    if (documentId) {
      req.app.get("io")?.to(`doc-${documentId}`).emit("ai-chat-message", aiChatMessage);
    } else {
      req.app.get("io")?.to(`user-${userId}`).emit("ai-response", {
        messageId: message._id
      });
    }

    res.json({
      success: true,
      response: aiResponse.content,
      tokens: aiResponse.tokens,
      messageId: message._id,
      aiChatMessageId: aiChatMessage?._id
    });

  } catch (error) {
    console.error("[AI Controller Error]", error);
    res.status(500).json({
      success: false,
      error: "AI processing failed",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// Streaming response endpoint
export const streamAIResponse = async (req, res) => {
  try {
    const { prompt, documentId } = req.body;
    const userId = req.user?.id;
    const io = req.app.get("io");
    const startTime = Date.now();
    let fullContent = "";
    let totalTokens = 0;

    // Verify document access if documentId is provided
    if (documentId) {
      const document = await Document.findOne({
        _id: new ObjectId(documentId),
        $or: [
          { owner: new ObjectId(userId) },
          { "collaborators.user": new ObjectId(userId) }
        ]
      });

      if (!document) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized document access' 
        });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await aiService.getCompletionStream(prompt);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const tokens = chunk.usage?.total_tokens || 0;
      
      fullContent += content;
      totalTokens += tokens;

      // Send to client
      res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      
      // Real-time socket update
      if (documentId) {
        io?.to(`doc-${documentId}`).emit("ai-stream", {
          content,
          complete: false
        });
      } else {
        io?.to(`user-${userId}`).emit("ai-stream", {
          content,
          complete: false
        });
      }
    }

    // Save completed messages
    await Promise.all([
      Message.create({
        prompt,
        response: {
          content: fullContent,
          tokens: totalTokens
        },
        user: userId || null,
        metadata: {
          processingTime: Date.now() - startTime
        },
        isStreamed: true
      }),
      documentId ? AIChatMessage.create({
        documentId,
        userId,
        content: fullContent,
        type: 'ai',
        metadata: {
          tokens: totalTokens,
          suggestedCode: extractCodeFromResponse(fullContent)
        }
      }) : null
    ]);

    // Final events
    if (documentId) {
      io?.to(`doc-${documentId}`).emit("ai-stream", { complete: true });
    } else {
      io?.to(`user-${userId}`).emit("ai-stream", { complete: true });
    }
    res.end();

  } catch (error) {
    console.error("[Stream Error]", error);
    res.write(`data: ${JSON.stringify({
      error: "Stream failed",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    })}\n\n`);
    res.end();
  }
};

// PATCH /api/ai-chat/messages/:messageId (feedback/update)
export const patchMessage = async (req, res) => {
  const { rating, comment, isChatMessage = false } = req.body;
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({ success: false, error: "No messageId provided in URL" });
  }

  try {
    const updateResult = isChatMessage
      ? await AIChatMessage.updateOne(
          { "messages.id": messageId },
          {
            $set: {
              "messages.$.feedback": {
                rating,
                comment,
                updatedAt: new Date()
              }
            }
          }
        )
      : await Message.findByIdAndUpdate(messageId, {
          feedback: { rating, comment, updatedAt: new Date() }
        });

    if (!updateResult || updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid feedback submission" });
  }
};


// POST /api/ai-chat/messages (manual message save, supports saving both user and AI messages together)
export const saveAIChatMessage = async (req, res) => {
  try {
    console.log("[saveAIChatMessage] payload received:", req.body);

    const { documentId, messages = [] } = req.body;
    const userId = req.user.id;

    // Validate basic structure
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required"
      });
    }

    // Add required fields to each message
    const formattedMessages = messages.map((msg) => ({
      id: new mongoose.Types.ObjectId().toString(),
      userId,
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp || new Date(),
      metadata: { ...msg.metadata, manual: true }
    }));

    const saved = await AIChatMessage.create({
      documentId,
      messages: formattedMessages
    });

    res.json({ success: true, saved });
  } catch (err) {
    console.error("[Manual Save Error]", err);
    res.status(500).json({
      success: false,
      error: "Failed to save message",
      details: err.message
    });
  }
};

// Get chat messages for a document
export const getChatMessages = async (req, res) => {
  try {
    const { documentId } = req.query;
    const userId = req.user.id;

    // More flexible document access check
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access more flexibly
    const hasAccess = 
      document.owner?.toString() === userId?.toString() ||
      document.collaborators?.some(c => c.user?.toString() === userId?.toString()) ||
      document.isPublic;

    console.log('Chat access check:', {
      documentId,
      userId,
      owner: document.owner?.toString(),
      hasAccess,
      collaboratorsCount: document.collaborators?.length || 0
    });

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Unauthorized document access',
        debug: {
          documentId,
          userId,
          owner: document.owner?.toString(),
          collaborators: document.collaborators?.map(c => c.user?.toString())
        }
      });
    }

    const messages = await AIChatMessage.find({ documentId })
      .sort({ createdAt: 1 })
      .populate('messages.userId', 'name avatar');

    res.json(messages);
  } catch (error) {
    console.error("[Get Messages Error]", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages"
    });
  }
};

// Helper function to extract code from response
const extractCodeFromResponse = (response) => {
  const codeBlockRegex = /```(?:[a-z]+)?\n([\s\S]*?)```/;
  const match = codeBlockRegex.exec(response);
  return match?.[1]?.trim();
};