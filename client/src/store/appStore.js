import { create } from 'zustand';
import { io } from "socket.io-client";
import { getIdToken } from '../firebase';
import { getAuth, signOut, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';

export const useAppStore = create((set, get) => ({
  // Initial state
  theme: 'dark',
  showOnboarding: false,
  showCommandPalette: false,
  showSettings: false,
  showAuth: true,
  showCollaboration: false,
  sidebarCollapsed: false,
  isAuthenticated: !!localStorage.getItem("currentUser"),
  currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
  isListening: false,
  voiceHistory: [],
  isCodeLocked: false,
  code: '',
  language: 'typescript',
  errors: [],
  messages: [],
  isAIThinking: false,
  users: [],
  collaborators: [],
  pendingInvitations: [],
  socket: null,
  socketConnected: false,
  currentDocumentId: localStorage.getItem("currentDocumentId") || null,
  aiUsage: [],
  // Toast state
  toasts: [],

  // Toast management
  addToast: (toast) => {
    const id = Date.now().toString();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast,
      timestamp: new Date()
    };
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // Auto-dismiss toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  showSuccessToast: (message, options = {}) => {
    return get().addToast({
      type: 'success',
      message,
      ...options
    });
  },

  showErrorToast: (message, options = {}) => {
    return get().addToast({
      type: 'error',
      message,
      duration: 7000,
      ...options
    });
  },

  showInfoToast: (message, options = {}) => {
    return get().addToast({
      type: 'info',
      message,
      ...options
    });
  },

  showWarningToast: (message, options = {}) => {
    return get().addToast({
      type: 'warning',
      message,
      duration: 6000,
      ...options
    });
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // ✅ Store state
ownerId: null,

// ✅ Updated safe collaborator setter that handles { collaborators, ownerId }
setCollaborators: (data) => {
  let safeArray = [];
  let owner = null;

  if (data && Array.isArray(data.collaborators)) {
    // { collaborators: [...], ownerId: "..." }
    safeArray = data.collaborators;
    owner = data.ownerId || null;
  } else if (Array.isArray(data)) {
    safeArray = data;
  } else if (data && typeof data === 'object') {
    safeArray = Object.values(data);
  }

  console.log('[AppStore] setCollaborators input:', data);
  console.log('[AppStore] setCollaborators sanitized:', safeArray);

  set({
    collaborators: safeArray,
    ...(owner && { ownerId: owner }) // only set ownerId if present
  });
},

// ✅ Socket connection management
connectSocket: async () => {
  if (!get().socket) {
    console.log("Initializing socket connection...");
    
    let token = localStorage.getItem("token");
    const tokenValid = await get().validateToken(token);
    if (!tokenValid) {
      const refreshed = await get().refreshToken();
      if (!refreshed) {
        console.warn("Token refresh failed - cannot connect socket");
        return;
      }
      token = localStorage.getItem("token");
    }

    const documentId = get().currentDocumentId;
    if (!documentId) {
      console.warn("No documentId available for socket connection");
      return;
    }

    const socket = io(import.meta.env.VITE_BACKEND_URL, {
      transports: ["websocket"],
      auth: { token },
      query: { documentId }
    });

    socket.on("connect", () => {
      set({ socketConnected: true });
      console.log("Socket connected:", socket.id);
      const currentUser = get().currentUser;
      if (documentId && currentUser?.id) {
        socket.emit("joinDocument", {
          documentId,
          userId: currentUser.id
        });
        console.log("Emitted joinDocument for", documentId, "userId", currentUser.id);
      } else {
        console.warn("joinDocument not emitted: missing documentId or userId", { documentId, userId: currentUser?.id });
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    socket.on("disconnect", () => {
      set({ socketConnected: false });
      console.log("Socket disconnected");
    });

    socket.on("codeUpdate", ({ code: newCode, sourceUserId }) => {
      const currentUserId = get().currentUser?.id;
      if (sourceUserId !== currentUserId && get().code !== newCode) {
        set({ code: newCode });
        console.log("✅ Applied external code update from:", sourceUserId);
      } else {
        console.log("🚫 Ignored self-originated update from:", sourceUserId);
      }
    });

    socket.on('collaboratorJoined', (user) => {
      set(state => ({
        collaborators: [...(Array.isArray(state.collaborators) ? state.collaborators : []), user]
      }));
    });

    socket.on('collaboratorLeft', ({ userId }) => {
      set(state => ({
        collaborators: (Array.isArray(state.collaborators) ? state.collaborators : []).filter(c => c.id !== userId)
      }));
    });

    socket.on('roleChanged', ({ userId, newRole }) => {
      set(state => ({
        collaborators: (Array.isArray(state.collaborators) ? state.collaborators : []).map(c => 
          c.id === userId ? { ...c, role: newRole } : c
        )
      }));
    });

    socket.on('collaboratorsUpdated', (updatedCollaborators) => {
      get().setCollaborators(updatedCollaborators);
    });

    socket.on('document:collaborators:update', ({ collaborators, ownerId }) => {
      console.log('[Socket] Received collaborators update:', collaborators, 'Owner:', ownerId);
      get().setCollaborators({ collaborators, ownerId });
    });

    socket.on('invitationsUpdated', (updatedInvitations) => {
      set({ pendingInvitations: updatedInvitations });
    });

    socket.on('aiChat:message', (newMessage) => {
      set(state => ({
        messages: [...state.messages, {
          ...newMessage,
          timestamp: new Date(newMessage.timestamp)
        }]
      }));
    });

    set({ socket });
  }
},

// ✅ Socket disconnect cleanup
disconnectSocket: () => {
  const socket = get().socket;
  if (socket) {
    socket.disconnect();
    set({ socket: null, socketConnected: false });
  }
},


  // Token management
  validateToken: async (token) => {
    if (!token) return false;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/validate-token`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      console.log("Token validation error:", e);
      return false;
    }
  },

  refreshToken: async () => {
    try {
      const token = await getIdToken(true);
      if (token) {
        localStorage.setItem("token", token);
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    return false;
  },

  // Code actions
  setCode: (newCode, errors = null, options = { emit: true }) => {
    const socket = get().socket;
    const currentUser = get().currentUser;
    const documentId = get().currentDocumentId;

    if (options.emit && socket && get().socketConnected && currentUser?.role !== "viewer") {
      socket.emit("codeChange", {
        documentId,
        code: newCode,
        sourceUserId: currentUser?.id
      });
    }

    set({ 
      code: newCode,
      ...(errors !== null && { errors })
    });
  },

  insertCodeSnippet: (snippet) => {
    const editor = window.monacoEditorInstance;
    if (!editor) {
      console.warn('Monaco editor instance not found');
      return false;
    }

    try {
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const op = {
        identifier: id,
        range: selection,
        text: snippet,
        forceMoveMarkers: true
      };
      editor.executeEdits("ai-insert", [op]);
      return true;
    } catch (error) {
      console.error('Failed to insert snippet:', error);
      return false;
    }
  },

  logAIUsage: (entry) => set((state) => ({
    aiUsage: [...state.aiUsage, { 
      ...entry, 
      timestamp: new Date(),
      documentId: state.currentDocumentId 
    }]
  })),

  setErrors: (errors) => set({ errors }),
  setLanguage: (language) => set({ language }),

  // Auth and user management
  syncUserWithBackend: async () => {
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/sync-user`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok && data.user && data.token) {
        const userWithRole = { 
          ...data.user, 
          role: data.user.role || 'editor',
          defaultDocumentId: data.user.defaultDocumentId || data.user.documentId || null
        };

        const documentId = userWithRole.defaultDocumentId;

        set({ 
          currentUser: userWithRole, 
          isAuthenticated: true, 
          showAuth: false,
          currentDocumentId: documentId
        });

        localStorage.setItem("currentUser", JSON.stringify(userWithRole));
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentDocumentId", documentId);

        if (documentId) {
          get().connectSocket();
          get().loadChatForDocument(documentId);
        }

        get().showSuccessToast(data.message || 'Successfully signed in!');
        return userWithRole;
      } else {
        get().showErrorToast(data.message || 'Failed to sync user data');
      }
    } catch (error) {
      console.error("Failed to sync user with backend:", error);
      get().showErrorToast('Connection error during sign in');
    }

    return null;
  },


  // Logout Function
  logout: () => {
  get().disconnectSocket();
  set({
    isAuthenticated: false,
    currentUser: null,
    showAuth: true,
    messages: [],
    users: [],
    collaborators: [],
    pendingInvitations: [],
    socketConnected: false,
    aiUsage: [],
    currentDocumentId: null // Ensure this is cleared
  });
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  localStorage.removeItem("currentDocumentId"); // Ensure this is cleared
},

  // Initialize app state

 initializeApp: async () => {
  const storedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("token");
  
  // Always check localStorage first for current document
  const storedDocumentId = localStorage.getItem("currentDocumentId");
  
  if (storedUser && token) {
    try {
      const isValid = await get().validateToken(token);
      if (isValid) {
        const parsedUser = JSON.parse(storedUser);
        
        // Use storedDocumentId if it exists, otherwise use user's default
        const documentId = storedDocumentId || parsedUser.defaultDocumentId;

        console.log("[INIT] Setting documentId:", documentId, 
          "(storedDocumentId:", storedDocumentId, 
          "defaultDocumentId:", parsedUser.defaultDocumentId, ")");

        const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding") === "true";

        set({
          isAuthenticated: true,
          currentUser: parsedUser,
          currentDocumentId: documentId, // This will keep the current document
          showAuth: false,
          showOnboarding: !hasSeenOnboarding,
        });

        if (!hasSeenOnboarding) {
          localStorage.setItem("hasSeenOnboarding", "true");
        }

        if (documentId) {
          get().connectSocket();
          get().loadChatForDocument(documentId);
        }
      } else {
        get().logout();
      }
    } catch (error) {
      console.error("Error initializing app:", error);
      get().logout();
    }
  } else {
    set({
      isAuthenticated: false,
      currentUser: null,
      showAuth: true,
      currentDocumentId: null,
      showOnboarding: false,
    });
  }
},


// Set the current document ID and manage socket connection
  setCurrentDocumentId: (documentId) => {
    set({ currentDocumentId: documentId });
    localStorage.setItem("currentDocumentId", documentId);
    
    get().disconnectSocket();
    if (documentId) {
      get().connectSocket();
      get().loadChatForDocument(documentId);
    }
  },

  addMessagePair: (userMsg, aiMsg) => {
    const documentId = get().currentDocumentId;
    const userId = get().currentUser?.id;

    const preparedUserMsg = {
      ...userMsg,
      id: userMsg.id || Date.now().toString(),
      timestamp: userMsg.timestamp ? new Date(userMsg.timestamp) : new Date(),
      documentId,
      userId,
      type: 'user'
    };

    const preparedAiMsg = {
      ...aiMsg,
      id: aiMsg.id || (Date.now() + 1).toString(),
      timestamp: aiMsg.timestamp ? new Date(aiMsg.timestamp) : new Date(),
      documentId,
      userId,
      type: 'ai'
    };

    set(state => ({
      messages: [...state.messages, preparedUserMsg, preparedAiMsg]
    }));

    if (!userMsg.isSystemMessage && !aiMsg.isSystemMessage) {
      get().saveToChatHistory(preparedUserMsg, preparedAiMsg);
    }
  },

  saveToChatHistory: async (userMsg, aiMsg) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentId: userMsg.documentId,
          messages: [
            {
              type: userMsg.type,
              content: userMsg.content,
              timestamp: userMsg.timestamp.toISOString(),
              debug: userMsg.debug
            },
            {
              type: aiMsg.type,
              content: aiMsg.content,
              timestamp: aiMsg.timestamp.toISOString(),
              metadata: aiMsg.metadata,
              isError: aiMsg.isError
            }
          ]
        })
      });

      if (response.ok) {
        console.log('Chat messages saved to backend');
        
        const socket = get().socket;
        if (socket && get().socketConnected) {
          socket.emit('aiChat:message', {
            ...userMsg,
            timestamp: userMsg.timestamp.toISOString()
          });
          socket.emit('aiChat:message', {
            ...aiMsg,
            timestamp: aiMsg.timestamp.toISOString()
          });
        }
      } else {
        console.error('Failed to save chat messages to backend');
      }
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  },

  fetchChatHistory: async (documentId) => {
    const docId = documentId || get().currentDocumentId;
    if (!docId) return;

    try {
      console.log('[fetchChatHistory] Loading chat for document:', docId);
      
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages?documentId=${docId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const chatDocuments = await response.json();
        console.log('[fetchChatHistory] Received:', chatDocuments.length, 'chat documents');
        
        const allMessages = [];
        chatDocuments.forEach(chatDoc => {
          if (chatDoc.messages && chatDoc.messages.length > 0) {
            chatDoc.messages.forEach(msg => {
              allMessages.push({
                ...msg,
                id: msg.id || msg._id || Date.now().toString(),
                timestamp: new Date(msg.timestamp),
                documentId: docId
              });
            });
          }
        });

        allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        console.log('[fetchChatHistory] Processed', allMessages.length, 'messages');
        
        set({ messages: allMessages });
        
        return allMessages;
      } else {
        console.error('[fetchChatHistory] Failed:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('[fetchChatHistory] Error:', error);
      return [];
    }
  },

  loadChatForDocument: async (documentId) => {
    const docId = documentId || get().currentDocumentId;
    if (!docId) return;

    console.log('[loadChatForDocument] Loading chat history for:', docId);
    
    set({ messages: [] });
    
    const messages = await get().fetchChatHistory(docId);
    
    if (messages.length === 0) {
      const currentUser = get().currentUser;
      const firstName = currentUser?.name?.split(' ')[0] || 'there';
      
      set(state => ({
        messages: [{
          id: 'welcome',
          type: 'ai',
          content: `Welcome back ${firstName}! I'm your AI pair programming partner. I can help analyze and improve your code. What would you like me to look at today?`,
          timestamp: new Date(),
          documentId: docId,
          isSystemMessage: true
        }]
      }));
    }
  },

  clearChatHistory: () => {
    set({ messages: [] });
    console.log('[clearChatHistory] Chat cleared');
  },

  updateMessage: async (messageId, updatedFields) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updatedFields } : msg
      )
    }));

    try {
      const message = get().messages.find(m => m.id === messageId);
      if (message && !message.isSystemMessage) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages/${messageId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...updatedFields,
            ...(updatedFields.timestamp && {
              timestamp: updatedFields.timestamp.toISOString()
            })
          })
        });
      }
    } catch (error) {
      console.error('[updateMessage] Error:', error);
    }
  },

  inviteCollaborator: async (email, role, documentId) => {
    const docId = documentId || get().currentDocumentId;
    if (!docId) throw new Error('No documentId provided for invitation');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invitations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          email, 
          role, 
          documentId: docId, 
          invitedBy: get().currentUser?.id 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        set(state => ({
          pendingInvitations: [...state.pendingInvitations, data]
        }));
        
        get().showSuccessToast(data.message || `Invitation sent to ${email}`);
        return data;
      } else {
        const errorMessage = data.error || data.message || 'Failed to send invitation';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      if (!error.message.includes('Failed to send invitation')) {
        get().showErrorToast(error.message || 'Network error while sending invitation');
      }
      throw error;
    }
  },

  fetchPendingInvitations: async (documentId) => {
    const docId = documentId || get().currentDocumentId;
    if (!docId) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/invitations/pending?documentId=${docId}`, 
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const invitations = await response.json();
        set({ pendingInvitations: invitations });
        return invitations;
      }
    } catch (error) {
      console.error('Failed to fetch pending invitations:', error);
    }
    return [];
  },

  fetchDocumentCollaborators: async (documentId) => {
    const docId = documentId || get().currentDocumentId;
    if (!docId) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/documents/${docId}/collaborators`, 
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('[fetchDocumentCollaborators] Raw API response:', responseData);
        
        // ✅ Fix: Extract only the collaborators array from the response
        const collaboratorsArray = responseData.collaborators || responseData;
        console.log('[fetchDocumentCollaborators] Extracted collaborators:', collaboratorsArray);
        
        get().setCollaborators(collaboratorsArray);
        return collaboratorsArray;
      }
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
    }
    return [];
  },

  cancelInvitation: async (invitationId, documentId) => {
    const docId = documentId || get().currentDocumentId;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invitations/${invitationId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        set(state => ({
          pendingInvitations: state.pendingInvitations.filter(inv => inv.id !== invitationId && inv._id !== invitationId)
        }));
        
        await get().fetchPendingInvitations(docId);
        get().showSuccessToast(data.message || 'Invitation cancelled successfully');
      } else {
        const errorMessage = data.error || data.message || 'Failed to cancel invitation';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      if (!error.message.includes('Failed to cancel invitation')) {
        get().showErrorToast(error.message || 'Network error while cancelling invitation');
      }
      throw error;
    }
  },

  acceptInvitation: async (invitationToken, userId) => {
    console.log('[acceptInvitation] Token:', invitationToken);
    console.log('[acceptInvitation] UserId:', userId);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invitations/${invitationToken}/accept`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[acceptInvitation] Success:', data);
        get().showSuccessToast(data.message || 'Invitation accepted successfully!');
        return data;
      } else {
        console.error('[acceptInvitation] Error response:', data);
        const errorMessage = data.error || data.message || 'Failed to accept invitation';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      if (!error.message.includes('Failed to accept invitation')) {
        get().showErrorToast(error.message || 'Network error while accepting invitation');
      }
      throw error;
    }
  },

  transferDocumentOwnership: async (documentId, newOwnerEmail) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/documents/${documentId}/transfer-ownership`, 
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newOwnerEmail })
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        await get().fetchDocumentCollaborators(documentId);
        get().showSuccessToast(data.message || 'Document ownership transferred successfully');
        return data;
      } else {
        const errorMessage = data.error || data.message || 'Failed to transfer ownership';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      if (!error.message.includes('Failed to transfer ownership')) {
        get().showErrorToast(error.message || 'Network error while transferring ownership');
      }
      throw error;
    }
  },

  updateCollaboratorRole: async (collaboratorId, newRole, documentId) => {
    const docId = documentId || get().currentDocumentId;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/collaborators/${collaboratorId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          role: newRole, 
          documentId: docId 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Optimistic update
        set(state => ({
          collaborators: (Array.isArray(state.collaborators) ? state.collaborators : []).map(c => 
            c.id === collaboratorId ? { ...c, role: newRole } : c
          )
        }));
        
        await get().fetchDocumentCollaborators(docId);
        get().showSuccessToast(data.message || `Role updated to ${newRole}`);
      } else {
        const errorMessage = data.error || data.message || 'Failed to update role';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating collaborator role:', error);
      if (!error.message.includes('Failed to update role')) {
        get().showErrorToast(error.message || 'Network error while updating role');
      }
      throw error;
    }
  },

  removeCollaborator: async (userId, documentId) => {
    const docId = documentId || get().currentDocumentId;
    if (!docId || !userId) throw new Error('Missing documentId or userId');

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${docId}/collaborators/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (response.ok) {
        // Optimistic update
        set(state => ({
          collaborators: (Array.isArray(state.collaborators) ? state.collaborators.filter(c => c.id !== userId) : [])
        }));

        await get().fetchDocumentCollaborators(docId);
        get().showSuccessToast(data.message || 'Collaborator removed successfully');
      } else {
        const errorMessage = data.error || data.message || 'Failed to remove collaborator';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      if (!error.message.includes('Failed to remove collaborator')) {
        get().showErrorToast(error.message || 'Network error while removing collaborator');
      }
      throw error;
    }
  },

  fetchInvitationByLink: async (inviteId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invitations/link/${inviteId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error('Failed to fetch invitation');
      }
    } catch (error) {
      console.error('Failed to fetch invitation by link:', error);
      throw error;
    }
  },

  processInviteLink: async (inviteId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invitations/link/${inviteId}`);
      const data = await res.json();
      
      if (!res.ok) {
        const errorMessage = data.error || data.message || 'Invalid invite link';
        get().showErrorToast(errorMessage);
        throw new Error(errorMessage);
      }
      
      const invite = data;
      localStorage.setItem("inviteInfo", JSON.stringify(invite));

      const auth = getAuth();
      const firebaseUser = auth.currentUser;

      if (firebaseUser && firebaseUser.email !== invite.email) {
        console.warn("Invite opened by wrong user. Signing out...");
        get().showWarningToast('This invite is for a different email address. Please sign in with the correct account.');
        await signOut(auth);
        localStorage.clear();
        window.location.reload();
        return;
      }

      if (!firebaseUser) {
        get().showInfoToast('Please sign in to accept the invitation');
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }

      await get().syncUserWithBackend();
      
    } catch (error) {
      console.error("Failed to process invite link:", error);
      localStorage.removeItem("inviteInfo");
      if (!error.message.includes('Invalid invite link')) {
        get().showErrorToast(error.message || 'Failed to process invite link');
      }
      throw error;
    }
  },

  // UI actions
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
  
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAuth: (show) => set({ showAuth: show }),
  setShowCollaboration: (show) => set({ showCollaboration: show }),
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
  setIsListening: (listening) => set({ isListening: listening }),
  addVoiceCommand: (command) => set((state) => ({
    voiceHistory: [command, ...state.voiceHistory.slice(0, 4)]
  })),
  setIsAIThinking: (thinking) => set({ isAIThinking: thinking }),
  setPendingInvitations: (pendingInvitations) => set({ pendingInvitations }),
}));