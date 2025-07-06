import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { TopBar } from './components/TopBar';
import { Workspace } from './components/Workspace';
import { VoiceControl } from './components/VoiceControl';
import { CollaborationAvatars } from './components/CollaborationAvatars';
import { OnboardingTour } from './components/OnboardingTour';
import { CommandPalette } from './components/CommandPalette';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthModal } from './components/AuthModal';
import { CollaborationPanel } from './components/CollaborationPanel';
import { useAppStore } from './store/appStore';
import { useHotkeys } from 'react-hotkeys-hook';
import AcceptInvitePage from './components/AcceptInvitePage';

function App() {
  const {
    theme,
    showOnboarding,
    showCommandPalette,
    showSettings,
    showAuth,
    showCollaboration,
    isAuthenticated,
    setShowCommandPalette,
    setShowSettings,
    setShowAuth,
    setShowCollaboration,
    initializeApp,
    currentDocumentId,
  } = useAppStore();

  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize app
  useEffect(() => {
    const init = async () => {
      await initializeApp();
      setIsLoaded(true);
    };
    const timer = setTimeout(init, 1000);
    return () => clearTimeout(timer);
  }, [initializeApp]);

  // Keyboard shortcuts
  useHotkeys('ctrl+/', () => setShowCommandPalette(true));
  useHotkeys('cmd+/', () => setShowCommandPalette(true));
  useHotkeys('ctrl+,', () => setShowSettings(true));
  useHotkeys('cmd+,', () => setShowSettings(true));

  useEffect(() => {
    console.log('Current documentId in store:', currentDocumentId);
  }, [currentDocumentId]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Pair++</h2>
          <p className="text-gray-400">Initializing your intelligent coding environment...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <TopBar />

        <Routes>
          <Route
            path="/documents/:documentId"
            element={
              <AuthenticatedContent>
                <Workspace />
                <VoiceControl />
                <CollaborationAvatars />
              </AuthenticatedContent>
            }
          />

          <Route path="/invite/:inviteId" element={<AcceptInvitePage />} />

          <Route
            path="/"
            element={
              isAuthenticated ? (
                currentDocumentId ? (
                  <Navigate to={`/documents/${currentDocumentId}`} replace />
                ) : (
                  <LoadingFallback />
                )
              ) : (
                <AuthLandingPage setShowAuth={setShowAuth} />
              )
            }
          />
        </Routes>

        {/* Global UI for authenticated users */}
        {isAuthenticated && (
          <>
            {showOnboarding && <OnboardingTour />}
            {showCommandPalette && <CommandPalette />}
          </>
        )}

        {/* Modals */}
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <CollaborationPanel
          isOpen={showCollaboration}
          onClose={() => setShowCollaboration(false)}
        />

        {/* React Hot Toast Notifications */}
        <Toaster position="top-right" reverseOrder={false} />
      </div>
    </div>
  );
}

// Authenticated content wrapper
function AuthenticatedContent({ children }) {
  const { isAuthenticated } = useAppStore();
  if (!isAuthenticated) {
    return <AuthLandingPage setShowAuth={useAppStore.getState().setShowAuth} />;
  }
  return <>{children}</>;
}

// Landing page for unauthenticated users
function AuthLandingPage({ setShowAuth }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-white">AI</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to AI Pair++
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
          Your intelligent pair programming companion. Sign in to start coding with AI assistance.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAuth(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Get Started
        </motion.button>
      </motion.div>
    </div>
  );
}

// Fallback while waiting for document
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center text-gray-500 dark:text-gray-300"
      >
        Preparing your document...
      </motion.div>
    </div>
  );
}

export default App;
