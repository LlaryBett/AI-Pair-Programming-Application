import { User } from '../models/User.js';
import { Document } from '../models/Document.js';

class SocketManager {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> socketId
    this.userDocuments = new Map(); // userId -> Set(documentIds)
    this.userCursors = new Map(); // userId -> { [documentId]: { line, column } }
  }

  handleConnection(socket, userId) {
    this.userSockets.set(userId, socket.id);
  }

  handleDisconnect(userId) {
    const documentIds = this.userDocuments.get(userId) || new Set();
    documentIds.forEach(documentId => {
      this.emitToDocument(documentId, 'collaboratorLeft', { userId });

      if (this.userCursors.has(userId)) {
        delete this.userCursors.get(userId)[documentId];
      }

      this.emitCollaborators(documentId);
    });

    this.userSockets.delete(userId);
    this.userDocuments.delete(userId);
    this.userCursors.delete(userId);
  }

  addUserToDocument(userId, documentId) {
    if (!this.userDocuments.has(userId)) {
      this.userDocuments.set(userId, new Set());
    }
    this.userDocuments.get(userId).add(documentId);

    if (!this.userCursors.has(userId)) {
      this.userCursors.set(userId, {});
    }
    if (!this.userCursors.get(userId)[documentId]) {
      this.userCursors.get(userId)[documentId] = null;
    }
  }

  setUserCursor(userId, documentId, cursor) {
    if (!this.userCursors.has(userId)) {
      this.userCursors.set(userId, {});
    }
    this.userCursors.get(userId)[documentId] = cursor;
  }

  

   async emitCollaborators(documentId) {
  const collaborators = [];
  let ownerId = null;
  let document = null;

  try {
    document = await Document.findById(documentId)
      .select('owner collaborators')
      .populate('collaborators.user', 'name avatarUrl color email');
    
    if (document?.owner) {
      ownerId = document.owner.toString();
    }
  } catch (err) {
    console.error('[SocketManager] Failed to fetch document and owner:', err);
    return;
  }

  for (const [userId, docs] of this.userDocuments.entries()) {
    if (!docs.has(documentId)) continue;

    const userDoc = document.collaborators?.find(
      c => c.user && c.user._id.toString() === userId
    );

    const role = userId === ownerId
      ? 'owner'
      : userDoc?.role || 'viewer';

    const userInfo = {
      id: userId,
      isOnline: true,
      cursor: this.userCursors.get(userId)?.[documentId] || null,
      role // ✅ role included
    };

    try {
      // Reuse populated user info if available
      if (userDoc?.user) {
        userInfo.name = userDoc.user.name;
        userInfo.avatar = userDoc.user.avatarUrl || null;
        userInfo.color = userDoc.user.color || '#4f46e5';
        userInfo.email = userDoc.user.email;
      } else {
        // Fallback manual fetch
        const user = await User.findById(userId).select('name avatarUrl color email');
        if (user) {
          userInfo.name = user.name;
          userInfo.avatar = user.avatarUrl || null;
          userInfo.color = user.color || '#4f46e5';
          userInfo.email = user.email;
        }
      }
    } catch (e) {
      console.warn(`[SocketManager] Fallback user info failed for ${userId}`);
    }

    collaborators.push(userInfo);
  }

  // Emit both events
  this.emitToDocument(documentId, 'collaboratorsUpdated', collaborators);
  this.emitToDocument(documentId, 'document:collaborators:update', {
    collaborators,
    ownerId
  });
}


  emitToDocument(documentId, event, data) {
    this.io.to(`doc-${documentId}`).emit(event, data);
  }

  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

export { SocketManager };
