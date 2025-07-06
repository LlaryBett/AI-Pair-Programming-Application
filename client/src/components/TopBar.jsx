import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Share2, 
  Settings, 
  Sun, 
  Moon, 
  Users,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const TopBar = () => {
  const { 
    theme, 
    toggleTheme, 
    collaborators, 
    currentUser, 
    setShowSettings,
    setShowCollaboration,
    logout,
    isAuthenticated
  } = useAppStore();

  // Determine per-document role
  const docRole = collaborators.find(c => c.id === currentUser?.id)?.role || 'viewer';
  const activeCollaborators = collaborators.filter(c => c.isOnline);
  const shouldShowBanner = docRole === 'viewer';

  // Debug logs
  console.log('🔍 currentUser:', currentUser);
  console.log('🧾 Per-document role:', docRole);
  console.log('📢 Should show viewer banner:', shouldShowBanner);

  return (
    <>
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6"
      >
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Pair++
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Intelligent Pair Programming
            </p>
          </div>
        </div>

        {/* Center Status */}
        <div className="flex items-center space-x-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>AI Ready</span>
          </motion.div>

          {activeCollaborators.length > 1 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCollaboration(true)}
              className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Users className="w-3 h-3" />
              <span>{activeCollaborators.length} Active</span>
            </motion.button>
          )}

          {/* User Info */}
          {isAuthenticated && currentUser && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full text-sm"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold uppercase">
                {currentUser.name
                  ? currentUser.name
                      .split(' ')
                      .map(word => word[0])
                      .join('')
                      .slice(0, 2)
                  : 'LK'}
              </div>
              <span className="text-gray-700 dark:text-gray-300">
                {currentUser.name}
              </span>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? 
              <Moon className="w-4 h-4" /> : 
              <Sun className="w-4 h-4" />
            }
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCollaboration(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>

          {isAuthenticated && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-red-500"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </motion.header>

      {/* 🔒 Banner for Viewers only */}
      {shouldShowBanner && (
        <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-sm text-center py-2 border-b border-yellow-300 dark:border-yellow-700">
          You are currently a <strong>Viewer</strong>. You don’t have permission to edit this document.
        </div>
      )}
    </>
  );
};
