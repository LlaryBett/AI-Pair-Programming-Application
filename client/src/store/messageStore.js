import { create } from 'zustand';

export const useMessageStore = create((set, get) => ({
  messages: [],
  isAIThinking: false,
  
  // Socket listener setup
  setupSocketListeners: (socket) => {
    socket.on('aiChat:message', (newMessage) => {
      set(state => ({
        messages: [...state.messages, {
          ...newMessage,
          timestamp: new Date(newMessage.timestamp)
        }]
      }));
    });
  },

  // Fetch chat history
  fetchChatHistory: async (documentId) => {
    if (!documentId) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages?documentId=${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (res.ok) {
        const messages = await res.json();
        set({
          messages: messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            documentId
          }))
        });
        return messages;
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      return [];
    }
  },

  // Add message (now requires explicit documentId and userId)
  addMessage: async (message, { 
    documentId, 
    userId, 
    socket, 
    socketConnected 
  } = {}) => {
    const newMessage = {
      ...message,
      id: message.id || Date.now().toString(),
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      documentId,
      userId
    };

    // Optimistic update
    set(state => ({ messages: [...state.messages, newMessage] }));

    // Persist to backend if needed
    if ((message.type === 'user' || message.type === 'ai') && !message.isSystemMessage) {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...newMessage,
            timestamp: newMessage.timestamp.toISOString()
          })
        });

        if (res.ok && socket && socketConnected) {
          socket.emit('aiChat:message', {
            ...newMessage,
            timestamp: newMessage.timestamp.toISOString()
          });
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  },

  // Update message
  updateMessage: async (id, updatedFields) => {
    set(state => ({
      messages: state.messages.map(msg => 
        msg.id === id ? { ...msg, ...updatedFields } : msg
      )
    }));

    try {
      const message = get().messages.find(m => m.id === id);
      if (message && (message.type === 'user' || message.type === 'ai') && !message.isSystemMessage) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages/${id}`, {
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
      console.error('Error updating message:', error);
    }
  },

  // Add message pair (now requires explicit documentId and userId)
  addMessagePair: async (userMsg, aiMsg, { 
    documentId, 
    userId, 
    socket, 
    socketConnected 
  } = {}) => {
    const preparedUserMsg = {
      ...userMsg,
      id: userMsg.id || Date.now().toString(),
      timestamp: new Date(userMsg.timestamp || Date.now()),
      documentId,
      userId
    };

    const preparedAiMsg = {
      ...aiMsg,
      id: aiMsg.id || (Date.now() + 1).toString(),
      timestamp: new Date(aiMsg.timestamp || Date.now()),
      documentId,
      userId
    };

    if (!preparedAiMsg.content?.trim()) return;

    // Optimistic update
    set(state => ({
      messages: [...state.messages, preparedUserMsg, preparedAiMsg]
    }));

    // Backend persistence
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentId,
          messages: [
            {
              type: preparedUserMsg.type,
              content: preparedUserMsg.content,
              timestamp: preparedUserMsg.timestamp.toISOString()
            },
            {
              type: preparedAiMsg.type,
              content: preparedAiMsg.content,
              timestamp: preparedAiMsg.timestamp.toISOString()
            }
          ]
        })
      });

      if (res.ok && socket && socketConnected) {
        socket.emit('aiChat:message', {
          ...preparedUserMsg,
          timestamp: preparedUserMsg.timestamp.toISOString()
        });
        socket.emit('aiChat:message', {
          ...preparedAiMsg,
          timestamp: preparedAiMsg.timestamp.toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving message pair:', error);
    }
  },

  // Thinking state
  setIsAIThinking: (thinking) => set({ isAIThinking: thinking }),

  // Clear messages
  clearMessages: () => set({ messages: [] })
}));

// Updated convenience functions that require all necessary parameters
export const fetchChatHistory = (documentId) => 
  useMessageStore.getState().fetchChatHistory(documentId);

export const addMessage = (message, params) => 
  useMessageStore.getState().addMessage(message, params);

export const addMessagePair = (userMsg, aiMsg, params) => 
  useMessageStore.getState().addMessagePair(userMsg, aiMsg, params);

export const updateMessage = (id, updatedFields) => 
  useMessageStore.getState().updateMessage(id, updatedFields);

export const setIsAIThinking = (thinking) => 
  useMessageStore.getState().setIsAIThinking(thinking);