import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, History, AudioWaveform as Waveform } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const VoiceControl = () => {
  const { 
    isListening, 
    setIsListening, 
    voiceHistory, 
    addVoiceCommand, 
    addMessage,
    updateMessage,
    setIsAIThinking,
    messages // <-- get messages from store
  } = useAppStore();
  
  const [recognition, setRecognition] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechRecognition = new SpeechRecognition();
      
      speechRecognition.continuous = false;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';

      speechRecognition.onstart = () => {
        setIsListening(true);
        setCurrentTranscript('');
      };

      speechRecognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          addVoiceCommand(finalTranscript);
          handleVoiceToAIChat(finalTranscript);
        }
      };

      speechRecognition.onend = () => {
        setIsListening(false);
        setCurrentTranscript('');
      };

      speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setCurrentTranscript('');
      };

      setRecognition(speechRecognition);
    }
  }, []);

  // New unified handler for sending voice prompt to AIChat
  const handleVoiceToAIChat = async (prompt) => {
    // Add user message to chat
    const userMessageId = Date.now().toString();
    addMessage({
      id: userMessageId,
      type: 'user',
      content: `🎤 ${prompt}`,
      timestamp: new Date(),
      debug: {
        sentAt: new Date().toISOString(),
        rawInput: prompt
      }
    });

    setIsAIThinking(true);

    // Add temporary AI message
    const aiMessageId = (Date.now() + 1).toString();
    addMessage({
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date()
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ai-chat/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      const aiResponse = data.response;
      updateMessage(aiMessageId, {
        content: aiResponse,
        timestamp: new Date(),
        metadata: { 
          tokens: data.tokens,
          messageId: data.messageId,
          debug: {
            receivedAt: new Date().toISOString(),
            apiResponse: data
          }
        }
      });
    } catch (err) {
      updateMessage(aiMessageId, {
        content: `Error: ${err.message}`,
        isError: true,
        timestamp: new Date(),
        metadata: {
          debug: {
            error: err.message,
            stack: err.stack
          }
        }
      });
    } finally {
      setIsAIThinking(false);
    }
  };

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <>
      {/* Main Voice Control Bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex items-center space-x-2">
          {/* Voice History */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <History className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </motion.button>

          {/* Waveform Animation */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center space-x-1 px-2"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [4, 16, 8, 20, 6],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                    className="w-1 bg-blue-500 rounded-full"
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Mic Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleListening}
            className={`relative p-4 rounded-full transition-all duration-300 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            }`}
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
            
            {isListening && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-red-300"
              />
            )}
          </motion.button>

          {/* Text-to-Speech: Speak most recent AI response or cancel if already speaking */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
              } else {
                // Find the most recent AI message
                const lastAIMessage = [...messages].reverse().find(m => m.type === 'ai' && m.content);
                if (lastAIMessage) {
                  speakText(lastAIMessage.content);
                } else {
                  speakText('No AI response yet.');
                }
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </motion.button>
        </div>

        {/* Current Transcript */}
        <AnimatePresence>
          {currentTranscript && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                "{currentTranscript}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Voice History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40 w-80"
          >
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Recent Voice Commands
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {voiceHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No voice commands yet. Try saying "Explain this code" or "Fix the errors"
                  </p>
                ) : (
                  voiceHistory.map((command, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                    >
                      "{command}"
                    </motion.div>
                  ))
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Try commands like: "Explain this function", "Fix line 10", "Optimize this code"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};