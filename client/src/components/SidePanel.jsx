import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Bug, HelpCircle, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { AIChat } from './AIChat';
import { DebugHelper } from './DebugHelper';
import { useAppStore } from '../store/appStore';

export const SidePanel = () => {
  const { toggleSidebar } = useAppStore();
  const [activeTab, setActiveTab] = useState('chat');

  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <PanelRightClose className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <AIChat />}
        {activeTab === 'debug' && <DebugHelper />}
        {activeTab === 'help' && <HelpPanel />}
      </div>
    </div>
  );
};

const HelpPanel = () => {
  const helpItems = [
    {
      title: 'Voice Commands',
      items: [
        '"Explain this function"',
        '"Fix the error on line 10"',
        '"Optimize this code"',
        '"Add error handling"'
      ]
    },
    {
      title: 'Keyboard Shortcuts',
      items: [
        'Ctrl+/ - Command Palette',
        'Ctrl+Shift+P - AI Actions',
        'F1 - Quick Help',
        'Alt+Enter - Quick Fix'
      ]
    },
    {
      title: 'AI Features',
      items: [
        'Inline error explanations',
        'One-click code fixes',
        'Code optimization suggestions',
        'Real-time collaboration'
      ]
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {helpItems.map((section, index) => (
        <motion.div
          key={section.title}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {section.title}
          </h3>
          <ul className="space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
};