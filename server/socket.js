import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SocketManager } from './services/SocketManager.js';
import { checkDocumentAccess } from './middleware/auth.js';

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    }
  });

  const socketManager = new SocketManager(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id || decoded.id;
      if (!userId) return next(new Error('Invalid token payload'));

      socket.user = { ...decoded, id: userId };
      socketManager.handleConnection(socket, userId);

      console.log(`[SOCKET] ✅ User connected: ${userId}`);
      next();
    } catch (err) {
      console.error('[SOCKET] ❌ Authentication error:', err.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinDocument', async ({ documentId, userId }) => {
      if (!userId || !documentId) {
        console.warn('[SOCKET] ⚠️ Invalid joinDocument payload:', { userId, documentId });
        return socket.disconnect(true);
      }

      const hasAccess = await checkDocumentAccess(userId, documentId);
      if (!hasAccess) {
        console.warn(`[SOCKET] ⛔ Access denied: user ${userId} -> doc ${documentId}`);
        return socket.disconnect(true);
      }

      const room = `doc-${documentId}`;
      socket.documentId = documentId;
      socket.join(room);
      socketManager.addUserToDocument(userId, documentId);

      // Update everyone
      socketManager.emitCollaborators(documentId);

      // Notify others
      socketManager.emitToDocument(documentId, 'collaboratorJoined', {
        userId,
        name: socket.user.name
      });

      console.log(`[SOCKET] ✅ User ${userId} joined room ${room}`);
    });

    socket.on('cursorUpdate', ({ line, column, userId }) => {
      if (!socket.documentId || !userId) return;
      socketManager.setUserCursor(userId, socket.documentId, { line, column });
      socketManager.emitCollaborators(socket.documentId);
    });

    socket.on('codeChange', ({ documentId, code, sourceUserId }) => {
      if (!documentId) {
        console.warn(`[SOCKET] ⚠️ codeChange ignored — missing documentId`);
        return;
      }

      socketManager.emitToDocument(documentId, 'codeUpdate', {
        documentId,
        code,
        sourceUserId,
        timestamp: new Date()
      });

      console.log(`[SOCKET] 🔄 codeChange broadcasted: user ${sourceUserId} -> doc ${documentId}`);
    });

    socket.on('disconnect', () => {
      const userId = socket.user?.id;
      if (userId) {
        console.log(`[SOCKET] ❌ Disconnecting user ${userId}`);
        socketManager.handleDisconnect(userId);
        if (socket.documentId) {
          socketManager.emitCollaborators(socket.documentId);
        }
      }
    });
  });

  return { io, socketManager };
}
