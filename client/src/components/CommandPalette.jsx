import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Mic, 
  Wrench, 
  MessageSquare, 
  Bug, 
  Lightbulb,
  Code,
  Zap,
  Sparkles,
  X
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const commands = [
  {
    id: 'explain-code',
    title: 'Explain Selected Code',
    description: 'Get AI explanation of the selected code block',
    icon: MessageSquare,
    shortcut: 'Ctrl+E',
    action: () => console.log('Explain code')
  },
  {
    id: 'fix-errors',
    title: 'Fix All Errors',
    description: 'Let AI fix all detected errors in the code',
    icon: Wrench,
    shortcut: 'Ctrl+F',
    action: () => console.log('Fix errors')
  },
  {
    id: 'optimize-code',
    title: 'Optimize Performance',
    description: 'Get suggestions to improve code performance',
    icon: Zap,
    shortcut: 'Ctrl+O',
    action: () => console.log('Optimize code')
  },
  {
    id: 'voice-command',
    title: 'Start Voice Command',
    description: 'Begin voice interaction with AI assistant',
    icon: Mic,
    shortcut: 'Ctrl+M',
    action: () => console.log('Voice command')
  },
  {
    id: 'debug-help',
    title: 'Debug Assistant',
    description: 'Open debug panel with error analysis',
    icon: Bug,
    shortcut: 'Ctrl+D',
    action: () => console.log('Debug help')
  },
  {
    id: 'code-review',
    title: 'Request Code Review',
    description: 'Get comprehensive AI code review',
    icon: Code,
    shortcut: 'Ctrl+R',
    action: () => console.log('Code review')
  },
  {
    id: 'suggest-improvements',
    title: 'Suggest Improvements',
    description: 'Get AI suggestions for code improvements',
    icon: Lightbulb,
    shortcut: 'Ctrl+I',
    action: () => console.log('Suggest improvements')
  },
  {
    id: 'refactor-code',
    title: 'Refactor Code',
    description: 'AI-powered code refactoring suggestions',
    icon: Sparkles,
    shortcut: 'Ctrl+Shift+R',
    action: () => console.log('Refactor code')
  }
];

export const CommandPalette = () => {
  const { showCommandPalette, setShowCommandPalette, addMessage, setIsAIThinking } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    command.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showCommandPalette) return;

      switch (e.key) {
        case 'Escape':
          setShowCommandPalette(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, selectedIndex, filteredCommands, setShowCommandPalette]);

  const executeCommand = (command) => {
    setShowCommandPalette(false);
    setSearchTerm('');
    
    // Add user message
    addMessage({
      type: 'user',
      content: `🎯 ${command.title}`
    });

    // Simulate AI processing
    setIsAIThinking(true);
    setTimeout(() => {
      setIsAIThinking(false);
      addMessage({
        type: 'ai',
        content: `I'll help you with "${command.title}". ${command.description} Let me analyze your code...`
      });
    }, 1000);

    // Execute the command action
    command.action();
  };

  if (!showCommandPalette) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowCommandPalette(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Command Palette */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search commands... (or press Ctrl+/ to close)"
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg focus:outline-none"
            />
            <button
              onClick={() => setShowCommandPalette(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  No commands found for "{searchTerm}"
                </p>
              </div>
            ) : (
              filteredCommands.map((command, index) => {
                const Icon = command.icon;
                const isSelected = index === selectedIndex;
                
                return (
                  <motion.div
                    key={command.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => executeCommand(command)}
                    className={`flex items-center space-x-4 p-4 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-r-2 border-blue-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${
                        isSelected 
                          ? 'text-blue-900 dark:text-blue-100' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {command.title}
                      </h3>
                      <p className={`text-sm ${
                        isSelected 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {command.description}
                      </p>
                    </div>
                    
                    {command.shortcut && (
                      <div className={`px-2 py-1 text-xs rounded border ${
                        isSelected 
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                      }`}>
                        {command.shortcut}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>↵ Execute</span>
                <span>Esc Close</span>
              </div>
              <span>{filteredCommands.length} commands</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};