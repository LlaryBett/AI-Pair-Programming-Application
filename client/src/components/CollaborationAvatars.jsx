import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const CollaborationAvatars = () => {
  const { collaborators, currentUser } = useAppStore();

  const activeUsers = collaborators.filter(user => user.isOnline);

  useEffect(() => {
    console.log('[Active Collaborators]', activeUsers);
  }, [activeUsers]);

  if (activeUsers.length <= 1) return null;

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed top-20 right-6 z-40 space-y-4"
    >
      {/* Collaboration Status */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-lg"
      >
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Live Session
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {activeUsers.length} developers online
        </p>
      </motion.div>

      {/* User Avatars */}
      <div className="space-y-2">
        <AnimatePresence>
          {activeUsers.map((user, index) => (
            <UserAvatar 
              key={user.id} 
              user={user} 
              index={index}
              isCurrentUser={user.id === currentUser?.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const UserAvatar = ({ user, index, isCurrentUser }) => {
  const initials = user.name
    ? user.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email?.[0].toUpperCase() || 'U';

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
    >
      <div
        className="w-12 h-12 rounded-full border-2 shadow-lg relative flex items-center justify-center text-white font-bold text-sm"
        style={{
          borderColor: user.color || '#4f46e5',
          backgroundColor: user.color || '#4f46e5'
        }}
      >
        {initials}

        {/* Online Status */}
        <div className="absolute -bottom-1 -right-1">
          <div className="w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          </div>
        </div>

        {/* Typing Indicator */}
        {user.cursor && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 opacity-50"
            style={{ borderColor: user.color || '#4f46e5' }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
          <p className="font-medium">{user.name}</p>
          {user.cursor && (
            <p className="text-xs opacity-75">
              Line {user.cursor.line}, Column {user.cursor.column}
            </p>
          )}
          {isCurrentUser && (
            <p className="text-xs text-blue-400">(You)</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
