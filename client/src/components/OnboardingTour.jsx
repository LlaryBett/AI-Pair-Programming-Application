import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  MessageSquare, 
  Wrench, 
  Users,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to AI Pair++!',
    description: 'Your intelligent pair programming companion that understands code, fixes bugs, and collaborates with you in real-time.',
    icon: Sparkles,
    position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlight: null
  },
  {
    id: 'code-editor',
    title: 'Smart Code Editor',
    description: 'Monaco-powered editor with real-time AI analysis. Click the 🛠️ icons next to errors for instant fixes!',
    icon: Wrench,
    position: { top: '20%', left: '30%' },
    highlight: '.monaco-editor'
  },
  {
    id: 'voice-control',
    title: 'Voice Programming',
    description: 'Talk to your AI! Try saying "Explain this function" or "Fix the error on line 10". Press the mic to start.',
    icon: Mic,
    position: { bottom: '25%', left: '50%', transform: 'translateX(-50%)' },
    highlight: '.voice-control'
  },
  {
    id: 'ai-chat',
    title: 'AI Assistant',
    description: 'Get detailed explanations, code reviews, and suggestions. The AI remembers your conversation context.',
    icon: MessageSquare,
    position: { top: '30%', right: '10%' },
    highlight: '.ai-chat'
  },
  {
    id: 'collaboration',
    title: 'Live Collaboration',
    description: 'See other developers in real-time with AI-mediated suggestions and conflict resolution.',
    icon: Users,
    position: { top: '25%', right: '10%' },
    highlight: '.collaboration-avatars'
  }
];

export const OnboardingTour = () => {
  const { setShowOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentTourStep = tourSteps[currentStep];

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsCompleting(true);
    setTimeout(() => {
      setShowOnboarding(false);
    }, 500);
  };

  const skipTour = () => {
    setShowOnboarding(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Spotlight Effect */}
        {currentTourStep.highlight && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute bg-white/10 rounded-lg"
              style={{
                // This would need to be calculated based on the actual element
                top: '20%',
                left: '10%',
                right: '25%',
                bottom: '40%',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
        )}

        {/* Tour Popup */}
        <motion.div
          key={currentStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: isCompleting ? 0.8 : 1, 
            opacity: isCompleting ? 0 : 1 
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm"
          style={currentTourStep.position}
        >
          {/* Close Button */}
          <button
            onClick={skipTour}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="pr-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <currentTourStep.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {currentTourStep.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {tourSteps.length}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              {currentTourStep.description}
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: `${((currentStep + 1) / tourSteps.length) * 100}%` 
                  }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={skipTour}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Skip Tour
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextStep}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  <span>
                    {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
                  </span>
                  {currentStep < tourSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Callouts */}
        <AnimatePresence>
          {currentStep === 2 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Try saying: "Explain the useEffect hook"
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-600"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};