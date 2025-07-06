import React from 'react';
import { motion } from 'framer-motion'; 
import { 
  Wifi, 
  WifiOff, 
  Cpu, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Zap
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const StatusBar = () => {
  const { errors, isAIThinking, users, language } = useAppStore();
  const [connectionStatus] = React.useState('connected'); // Remove setConnectionStatus
  const [processingTime, setProcessingTime] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const criticalErrors = errors.filter(e => e.severity === 'error').length;
  const warnings = errors.filter(e => e.severity === 'warning').length;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-8 bg-blue-600 dark:bg-blue-700 text-white text-xs flex items-center justify-between px-4 border-t border-blue-500 dark:border-blue-600"
    >
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Disconnected</span>
            </>
          )}
        </div>

        {/* Language */}
        <div className="flex items-center space-x-1">
          <span className="font-medium">{language.toUpperCase()}</span>
        </div>

        {/* Errors and Warnings */}
        <div className="flex items-center space-x-3">
          {criticalErrors > 0 && (
            <div className="flex items-center space-x-1 text-red-200">
              <AlertCircle className="w-3 h-3" />
              <span>{criticalErrors}</span>
            </div>
          )}
          {warnings > 0 && (
            <div className="flex items-center space-x-1 text-yellow-200">
              <AlertCircle className="w-3 h-3" />
              <span>{warnings}</span>
            </div>
          )}
          {criticalErrors === 0 && warnings === 0 && (
            <div className="flex items-center space-x-1 text-green-200">
              <CheckCircle className="w-3 h-3" />
              <span>No Issues</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Section */}
      <div className="flex items-center space-x-4">
        {/* AI Status */}
        {isAIThinking && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center space-x-1"
          >
            <Cpu className="w-3 h-3" />
            <span>AI Processing...</span>
          </motion.div>
        )}

        {/* Active Users */}
        {users.length > 1 && (
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-1">
              {users.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="w-4 h-4 rounded-full border border-white overflow-hidden"
                  style={{ backgroundColor: user.color }}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <span>{users.length} online</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Session Time */}
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{formatTime(processingTime)}</span>
        </div>

        {/* Performance Indicator */}
        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>Fast</span>
        </div>

        {/* Settings */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-1 hover:bg-blue-500 dark:hover:bg-blue-600 rounded transition-colors"
        >
          <Settings className="w-3 h-3" />
        </motion.button>
      </div>
    </motion.div>
  );
};