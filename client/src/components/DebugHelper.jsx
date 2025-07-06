import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Zap, Target, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const DebugHelper = () => {
  const { errors } = useAppStore();

  const suggestions = [
    {
      type: 'performance',
      icon: TrendingUp,
      title: 'Performance Optimization',
      description: 'Consider memoizing the todo list to prevent unnecessary re-renders',
      impact: 'High',
      effort: 'Low'
    },
    {
      type: 'accessibility',
      icon: Target,
      title: 'Accessibility Enhancement',
      description: 'Add ARIA labels to improve screen reader support',
      impact: 'Medium',
      effort: 'Low'
    },
    {
      type: 'security',
      icon: Zap,
      title: 'Security Improvement',
      description: 'Validate and sanitize user input before processing',
      impact: 'High',
      effort: 'Medium'
    }
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Error Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Error Summary</h3>
        <div className="space-y-2">
          {errors.map((error, index) => (
            <motion.div
              key={error.line}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {error.severity === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Line {error.line}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {error.message}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                error.severity === 'error' 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              }`}>
                {error.severity}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Code Quality Metrics */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Code Quality</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">C+</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Overall Grade</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">73%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Coverage</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">4</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Fixed Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">2</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Critical</div>
          </div>
        </div>
      </motion.div>

      {/* AI Suggestions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">AI Suggestions</h3>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <motion.div
                key={suggestion.title}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        suggestion.impact === 'High' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {suggestion.impact} Impact
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {suggestion.effort} Effort
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};