import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, ThumbsUp, ThumbsDown, Copy, Play, Loader2, Bug, Check, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

export const AIChat = () => {
  // Zustand state selectors
  const messages = useAppStore(state => state.messages);
  const addMessagePair = useAppStore(state => state.addMessagePair); // Changed from addMessage
  const updateMessage = useAppStore(state => state.updateMessage);
  const isAIThinking = useAppStore(state => state.isAIThinking);
  const setIsAIThinking = useAppStore(state => state.setIsAIThinking);
  const currentUser = useAppStore(state => state.currentUser);
  const setCode = useAppStore(state => state.setCode);
  const currentDocumentId = useAppStore(state => state.currentDocumentId);
  // Remove fetchChatHistory since it doesn't exist in the store

  const [input, setInput] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef(null);
  const welcomeInjectedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAIThinking]);

  useEffect(() => {
    if (currentDocumentId) {
      // Chat history will be managed through other means since fetchChatHistory doesn't exist
      console.log('Document loaded:', currentDocumentId);
    }
  }, [currentDocumentId]); // Remove fetchChatHistory dependency

  useEffect(() => {
    if (!welcomeInjectedRef.current && currentDocumentId) {
      const hasWelcome = messages.some(m => m.id === 'welcome');
      if (!hasWelcome && messages.length === 0) {
        const firstName = currentUser?.name?.split(' ')[0] || 'there';
        // For system messages, add directly to state
        useAppStore.setState(state => ({
          messages: [...state.messages, {
            id: 'welcome',
            type: 'ai',
            content: `Welcome ${firstName}! I'm your AI pair programming partner. I can help analyze and improve your code. What would you like me to look at?`,
            timestamp: new Date(),
            isSystemMessage: true
          }]
        }));
      }
      welcomeInjectedRef.current = true;
    }
  }, [currentDocumentId, messages, currentUser]); // Removed addMessage dependency

  const extractCodeFromResponse = (response) => {
    const codeBlockRegex = /```(?:[a-z]+)?\n([\s\S]*?)```/;
    const match = codeBlockRegex.exec(response);
    return match?.[1]?.trim();
  };

  const handleApplyCode = (code) => {
    if (!code) {
      toast.error('No code to apply');
      return;
    }
    
    toast((t) => (
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">Apply AI-suggested code to your editor?</p>
          <p className="text-sm text-gray-600">This will replace your current code</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setCode(code);
              toast.dismiss(t.id);
              toast.success('🎉 Code successfully applied to editor!', {
                duration: 3000,
                icon: '✅'
              });
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Apply
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              toast('Code application cancelled', {
                icon: '❌'
              });
            }}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 8000,
      style: {
        maxWidth: '500px',
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isAIThinking) return;

    const userContent = input;
    setInput('');
    setIsAIThinking(true);

    const code = useAppStore.getState().code;

    const prompt = `
You're an expert AI pair programming assistant.

Here is the current code from the user:
\`\`\`tsx
${code}
\`\`\`

User's request: "${userContent}"

Provide:
1. Clear explanation of any issues
2. Specific code improvements (in complete code blocks)
3. Best practice recommendations
Format your response with markdown for readability.
    `.trim();

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          prompt,
          documentId: currentDocumentId,
          userId: currentUser?.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      const aiResponse = data.response;
      const suggestedCode = extractCodeFromResponse(aiResponse);

      // Use addMessagePair instead of individual addMessage calls
      addMessagePair(
        {
          content: userContent,
          debug: {
            sentAt: new Date().toISOString(),
            rawInput: userContent
          }
        },
        {
          content: aiResponse,
          metadata: { 
            tokens: data.tokens,
            messageId: data.messageId,
            suggestedCode,
            debug: {
              receivedAt: new Date().toISOString(),
              apiResponse: data,
              hasCodeSuggestion: Boolean(suggestedCode)
            }
          }
        }
      );

      if (suggestedCode) {
        toast.success('🤖 AI provided code suggestions! Click the buttons to apply them.', {
          icon: <Code className="w-5 h-5 text-blue-500" />,
          duration: 5000
        });
      } else {
        toast.success(`💬 AI response received (${data.tokens} tokens)`, {
          duration: 2000
        });
      }

    } catch (err) {
      // Use addMessagePair for error case too
      addMessagePair(
        {
          content: userContent,
          debug: {
            sentAt: new Date().toISOString(),
            rawInput: userContent
          }
        },
        {
          content: `Error: ${err.message}`,
          isError: true,
          metadata: {
            debug: {
              error: err.message,
              stack: err.stack
            }
          }
        }
      );
      toast.error(`❌ Failed to get AI response: ${err.message}`, {
        duration: 4000
      });
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end p-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDebug(!showDebug)}
          className={`px-3 py-1 rounded-lg flex items-center gap-2 text-sm ${
            showDebug ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <Bug className="w-4 h-4" />
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              currentUser={currentUser}
              showDebug={showDebug}
              onApplyCode={handleApplyCode}
            />
          ))}
        </AnimatePresence>

        {isAIThinking && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything about your code..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAIThinking}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isAIThinking}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message, currentUser, showDebug, onApplyCode }) => {
  const isAI = message.type === 'ai';
  const hasCodeSuggestion = message.metadata?.suggestedCode;

  const handleFeedback = async (rating) => {
  try {
    const userQuery = useAppStore.getState().messages.find(
      m => m.timestamp < message.timestamp && m.type === 'user'
    )?.content;

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/messages/${message.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rating,
          comment: `User query: ${userQuery}`,
          isChatMessage: true
        })
      }
    );

    if (!response.ok) throw new Error('Feedback submission failed');

    const feedbackText = rating >= 4 ? 'positive' : 'negative';
    toast.success(`👍 Thanks for your ${feedbackText} feedback!`, {
      duration: 2000,
      icon: rating >= 4 ? '😊' : '🤔'
    });
  } catch (err) {
    toast.error(`❌ Failed to submit feedback: ${err.message}`, {
      duration: 3000
    });
  }
};


  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('📋 Message copied to clipboard!', {
      duration: 2000,
      icon: '📋'
    });
  };

  const handleInlineEdit = (codeSnippet) => {
    const editor = window.monacoEditorInstance;
    if (!editor) {
      toast.error('❌ Code editor not found. Please make sure the editor is active.', {
        duration: 4000
      });
      return;
    }

    try {
      const selection = editor.getSelection();
      const model = editor.getModel();
      
      if (selection && !selection.isEmpty()) {
        // Replace selected text with code snippet
        editor.executeEdits('ai-inline-edit', [{
          range: selection,
          text: codeSnippet,
          forceMoveMarkers: true
        }]);
        toast.success('✨ Code inserted at selection!', {
          duration: 3000,
          icon: '🎯'
        });
      } else {
        // Insert at cursor position
        const position = editor.getPosition();
        editor.executeEdits('ai-inline-edit', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: codeSnippet,
          forceMoveMarkers: true
        }]);
        toast.success('✨ Code inserted at cursor position!', {
          duration: 3000,
          icon: '📝'
        });
      }
      
      // Focus back to editor
      editor.focus();
    } catch (error) {
      console.error('Failed to insert code:', error);
      toast.error('❌ Failed to insert code. Please try again.', {
        duration: 4000
      });
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
    >
      {isAI && (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center order-1 mr-3 flex-shrink-0">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}

      <div className={`max-w-[80%] ${isAI ? 'order-2' : 'order-1'}`}>
        {showDebug && (
          <div className="debug-info mb-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg text-xs">
            {message.debug?.sentAt && (
              <p>Sent: {new Date(message.debug.sentAt).toLocaleTimeString()}</p>
            )}
            {message.debug?.rawInput && (
              <p>Raw input: <code>{message.debug.rawInput}</code></p>
            )}
            {message.metadata?.debug?.receivedAt && (
              <p>Received: {new Date(message.metadata.debug.receivedAt).toLocaleTimeString()}</p>
            )}
            {message.metadata?.suggestedCode && (
              <p className="text-green-600 dark:text-green-400">
                Contains code suggestion ({message.metadata.suggestedCode.split('\n').length} lines)
              </p>
            )}
            {message.documentId && (
              <p className="text-gray-500 dark:text-gray-400">
                Document: {message.documentId}
              </p>
            )}
            {message.metadata?.debug?.apiResponse && (
              <details className="mt-1">
                <summary>API Response</summary>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(message.metadata.debug.apiResponse, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-lg ${
            message.isError 
              ? 'bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700'
              : isAI
                ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                : 'bg-blue-600 text-white'
          } ${showDebug ? 'rounded-t-none' : ''}`}
        >
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children);
                
                return !inline ? (
                  <div className="relative mt-3 group">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm overflow-x-auto">
                      {match?.[1] && (
                        <span className="absolute top-1 right-2 text-xs text-gray-500">
                          {match[1]}
                        </span>
                      )}
                      <code {...props}>{children}</code>
                    </div>
                    <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(codeString);
                          toast.success('📋 Code copied to clipboard!', {
                            duration: 2000,
                            icon: '📋'
                          });
                        }}
                        className="p-1 text-gray-500 hover:text-blue-500"
                        title="Copy code"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {isAI && (
                        <>
                          <button
                            onClick={() => handleInlineEdit(codeString)}
                            className="p-1 text-gray-500 hover:text-green-500"
                            title="Insert at cursor/selection"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onApplyCode(codeString)}
                            className="p-1 text-gray-500 hover:text-purple-500"
                            title="Replace entire editor content"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
                    {children}
                  </code>
                );
              }
            }}
          >
            {isAI ? `**AI:** ${message.content}` : message.content}
          </ReactMarkdown>
        </div>

        {isAI && !message.isError && (
          <div className="flex items-center space-x-2 mt-2 px-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 text-gray-400 hover:text-green-500 transition-colors"
              onClick={() => handleFeedback(5)}
              title="Thumbs up"
            >
              <ThumbsUp className="w-3 h-3" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              onClick={() => handleFeedback(1)}
              title="Thumbs down"
            >
              <ThumbsDown className="w-3 h-3" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              onClick={handleCopy}
              title="Copy message"
            >
              <Copy className="w-3 h-3" />
            </motion.button>
            {hasCodeSuggestion && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                  title="Insert code at cursor"
                  onClick={() => handleInlineEdit(message.metadata.suggestedCode)}
                >
                  <Check className="w-3 h-3" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                  title="Replace all editor content"
                  onClick={() => onApplyCode(message.metadata.suggestedCode)}
                >
                  <Code className="w-3 h-3" />
                </motion.button>
              </>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
          {message.timestamp?.toLocaleTimeString() || 'Just now'}
          {showDebug && message.metadata?.tokens && (
            <span className="ml-2 text-gray-400">
              • {message.metadata.tokens} tokens
              {message.metadata.messageId && ` • ID: ${message.metadata.messageId}`}
            </span>
          )}
        </p>
      </div>
    </motion.div>
  );
};

const TypingIndicator = () => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="flex justify-start"
  >
    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
      <span className="text-white text-xs font-bold">AI</span>
    </div>
    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-lg">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
      </div>
    </div>
  </motion.div>
);

// Also need to update the appStore.js fetchChatHistory function