import React, { useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { Wrench, Lightbulb, AlertCircle, AlertTriangle, Lock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';

export const CodeEditor = () => {
  const { 
    code, 
    setCode, 
    theme, 
    errors,  
    addMessage, 
    setIsAIThinking,
    currentUser,
    collaborators,
    connectSocket,
    socket,
    socketConnected,
    currentDocumentId
  } = useAppStore();
  
  const editorRef = useRef(null);
  const currentCollaborator = collaborators.find(c => c.id === currentUser?.id);
  const role = currentCollaborator?.role;
  const canEdit = role === 'owner' || role === 'editor';

  const isRemoteUpdate = useRef(false);

  // Debounced code save to server
  const saveCodeToServer = useCallback(
    debounce(async (codeToSave, documentId) => {
      if (!documentId || !canEdit) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${documentId}/code`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ code: codeToSave })
        });

        if (response.ok) {
          toast.success('💾 Code saved successfully!', {
            duration: 2000,
            icon: '✅'
          });
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || 'Failed to save code to server';
          toast.error(`❌ ${errorMessage}`, {
            duration: 4000
          });
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
        toast.error(`❌ Error saving code: ${errorMessage}`, {
          duration: 4000
        });
      }
    }, 1000),
    [canEdit]
  );

  // Fetch document code on mount
  useEffect(() => {
    const fetchDocumentCode = async () => {
      if (!currentDocumentId) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${currentDocumentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const document = await response.json();
          if (document.code !== undefined) {
            setCode(document.code);
            toast.success('📄 Document loaded successfully!', {
              duration: 2000,
              icon: '📋'
            });
          }
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || 'Failed to load document';
          toast.error(`❌ ${errorMessage}`, {
            duration: 4000
          });
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
        toast.error(`❌ Error loading document: ${errorMessage}`, {
          duration: 4000
        });
      }
    };

    fetchDocumentCode();
  }, [currentDocumentId, setCode]);

  // Save on window close (optional safety)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (canEdit && code && currentDocumentId) {
        const blob = new Blob([JSON.stringify({ code })], { type: 'application/json' });
        navigator.sendBeacon(
          `${import.meta.env.VITE_BACKEND_URL}/api/documents/${currentDocumentId}/code`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [code, canEdit, currentDocumentId]);

  // Enhanced socket connection management
  useEffect(() => {
    if (!socketConnected && currentUser) {
      toast.loading('🔗 Connecting to collaboration server...', {
        id: 'socket-connect',
        duration: 3000
      });
      connectSocket();
    }
  }, [socketConnected, connectSocket, currentUser]);

  // Ensure joinDocument is emitted with both documentId and userId if not handled by store
  useEffect(() => {
    if (
      socket &&
      socketConnected &&
      currentUser?.id &&
      currentDocumentId
    ) {
      socket.emit('joinDocument', {
        documentId: currentDocumentId,
        userId: currentUser.id
      });
      toast.dismiss('socket-connect');
      toast.success('🤝 Connected to collaboration!', {
        duration: 2000,
        icon: '🔗'
      });
    }
  }, [socket, socketConnected, currentUser?.id, currentDocumentId]);

  // Handle incoming code updates
  useEffect(() => {
    if (!socket) return;

    const handleCodeUpdate = ({ code: newCode, sourceUserId }) => {
      if (sourceUserId === currentUser?.id) {
        return;
      }
      
      const collaborator = collaborators.find(c => c.id === sourceUserId);
      toast('🔄 Code updated by ' + (collaborator?.name || 'collaborator'), {
        duration: 2000,
        icon: '👥'
      });
      
      if (editorRef.current) {
        isRemoteUpdate.current = true;
        editorRef.current.setValue(newCode);
      }
    };

    socket.on("codeUpdate", handleCodeUpdate);
    return () => {
      socket.off("codeUpdate", handleCodeUpdate);
    };
  }, [socket, currentUser?.id, collaborators]);

  // Debounced cursor position updates
  const handleCursorChange = useCallback(debounce((position) => {
    if (socket?.connected && currentUser && currentDocumentId) {
      socket.emit("cursorUpdate", {
        line: position.lineNumber,
        column: position.column,
        userId: currentUser.id
      });
    }
  }, 100), [socket, currentUser, currentDocumentId]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      renderLineHighlight: 'gutter',
      readOnly: !canEdit,
    });

    editor.onDidChangeCursorPosition((e) => {
      handleCursorChange(e.position);
    });

    updateDecorations(editor, monaco);
  };

  // Update error and collaborator decorations
  const updateDecorations = (editor, monaco) => {
    const errorDecorations = errors.map(error => ({
      range: new monaco.Range(error.line, 1, error.line, 1),
      options: {
        isWholeLine: true,
        className: error.severity === 'error' ? 'error-line' : 'warning-line',
        glyphMarginClassName: error.severity === 'error' ? 'error-glyph' : 'warning-glyph',
        hoverMessage: { value: error.message }
      }
    }));

    const collaboratorDecorations = collaborators
      .filter(c => c.id !== currentUser?.id && c.cursor)
      .map(collaborator => ({
        range: new monaco.Range(
          collaborator.cursor.line, 
          collaborator.cursor.column, 
          collaborator.cursor.line, 
          collaborator.cursor.column
        ),
        options: {
          className: 'collaborator-cursor',
          hoverMessage: { value: `${collaborator.name || collaborator.id} is here` },
          afterContentClassName: 'collaborator-cursor-label',
          after: {
            content: collaborator.name || collaborator.id,
            inlineClassName: 'collaborator-cursor-name'
          }
        }
      }));

    editor.deltaDecorations([], [...errorDecorations, ...collaboratorDecorations]);
  };

  const handleEditorChange = (value) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (!canEdit) {
      toast.error('🔒 You need editor permissions to make changes', {
        duration: 3000
      });
      return;
    }
    
    setCode(value, null, { emit: true });
    saveCodeToServer(value, currentDocumentId);
  };

  const handleFixClick = (error) => {
    if (!canEdit) {
      toast.error('🔒 You need editor permissions to apply fixes', {
        duration: 4000
      });
      addMessage({
        type: 'ai',
        content: 'You need editor permissions to apply fixes. Please ask the project owner to upgrade your access.'
      });
      return;
    }

    toast.loading('🤖 AI is analyzing and fixing the issue...', {
      id: 'ai-fix',
      duration: 3000
    });
    
    setIsAIThinking(true);
    setTimeout(() => {
      setIsAIThinking(false);
      toast.dismiss('ai-fix');
      toast.success(`🔧 AI fix applied for line ${error.line}!`, {
        duration: 4000,
        icon: '🎯'
      });
      addMessage({
        type: 'ai',
        content: `I found the issue on line ${error.line}: "${error.message}". Here's the fix:`,
        codeSnippet: getFixForError(error),
        language: 'typescript'
      });
    }, 2000);
  };

  const getFixForError = (error) => {
    switch (error.line) {
      case 9:
        return `useEffect(() => {
     console.log('Effect running...');
     fetchTodos();
   }, []); // Add empty dependency array`;
      case 14:
        return `const fetchTodos = async () => {
     try {
       const response = await fetch('/api/todos');
       if (!response.ok) throw new Error('Failed to fetch');
       const data = await response.json();
       setTodos(data);
     } catch (error) {
       console.error('Error fetching todos:', error);
     }
   };`;
      case 21:
        return `const addTodo = () => {
     if (!inputValue.trim()) return; // Validate input
     setTodos([...todos, { 
       id: Date.now(), 
       text: inputValue, 
       completed: false 
     }]);
     setInputValue('');
   };`;
      case 47:
        return `onChange={() => {
     setTodos(todos.map(t => 
       t.id === todo.id ? { ...t, completed: !t.completed } : t
     ));
   }}`;
      default:
        return 'Fix applied successfully!';
    }
  };

  return (
    <div className="flex-1 relative">
      {/* Error Indicators */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        {errors.slice(0, 3).map((error, index) => (
          <motion.div
            key={error.line}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            {error.severity === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Line {error.line}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {error.message}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: canEdit ? 1.1 : 1 }}
              whileTap={{ scale: canEdit ? 0.9 : 1 }}
              onClick={() => {
                if (!canEdit) {
                  toast.error('🔒 You need editor permissions to apply AI fixes', {
                    duration: 4000
                  });
                  return;
                }
                handleFixClick(error);
              }}
              disabled={!canEdit}
              className={`p-1.5 rounded transition-colors ${
                canEdit
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title={canEdit ? "Fix with AI" : "Editor permissions required"}
            >
              <Wrench className="w-3 h-3" />
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Monaco Editor */}
      <div className="h-full">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          value={code}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'gutter',
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace',
            minimap: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            readOnly: !canEdit,
          }}
        />
      </div>

      {/* Custom CSS for decorations */}
      <style jsx global>{`
        .error-line {
          background-color: rgba(239, 68, 68, 0.1) !important;
        }
        .warning-line {
          background-color: rgba(245, 158, 11, 0.1) !important;
        }
        .error-glyph::before {
          content: '●';
          color: #ef4444;
          font-weight: bold;
        }
        .warning-glyph::before {
          content: '●';
          color: #f59e0b;
          font-weight: bold;
        }
        .collaborator-cursor {
          border-left: 2px solid #3b82f6;
          background-color: rgba(59, 130, 246, 0.1);
        }
        .collaborator-cursor-name {
          background-color: #3b82f6;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
};