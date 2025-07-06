import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { CodeEditor } from './CodeEditor';
import { SidePanel } from './SidePanel';
import { StatusBar } from './StatusBar';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

export const Workspace = () => {
  const navigate = useNavigate();
  const {
    sidebarCollapsed,
    currentUser,
    setCurrentDocumentId,
    currentDocumentId,
    isAuthenticated,
  } = useAppStore();
  const { documentId: urlDocumentId } = useParams();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      toast.loading('🔐 Authenticating user...', {
        id: 'auth-check',
        duration: 3000
      });
      return;
    }

    toast.dismiss('auth-check');
    
    const inviteInfoRaw = localStorage.getItem("inviteInfo");
    const inviteInfo = inviteInfoRaw ? JSON.parse(inviteInfoRaw) : null;
    const invitedDocId = inviteInfo?.documentId;
    const isFromInvite = invitedDocId === urlDocumentId;

    const isValidCurrentDoc =
      urlDocumentId === currentDocumentId ||
      urlDocumentId === currentUser.defaultDocumentId ||
      invitedDocId === urlDocumentId ||
      isFromInvite;

    if (!urlDocumentId) {
      toast.error('❌ No document ID found in URL. Redirecting to default document.', {
        duration: 4000
      });
      navigate(`/documents/${currentUser.defaultDocumentId}`, {
        replace: true,
        state: { from: 'missing-document-id' },
      });
      return;
    }

    if (!isValidCurrentDoc) {
      toast.error('❌ Document access denied. Redirecting to your default document.', {
        duration: 4000
      });
      navigate(`/documents/${currentUser.defaultDocumentId}`, {
        replace: true,
        state: { from: 'document-mismatch', attemptedId: urlDocumentId },
      });
      return;
    }

    if (currentDocumentId !== urlDocumentId) {
      toast.success('📄 Loading document...', {
        duration: 2000,
        icon: '📋'
      });
      setCurrentDocumentId(urlDocumentId);
    }
  }, [urlDocumentId, currentUser, isAuthenticated, navigate, setCurrentDocumentId, currentDocumentId]);

  useEffect(() => {
    if (!isAuthenticated && !currentUser) {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        toast('🔄 Redirecting to your workspace...', {
          duration: 2000,
          icon: '↩️'
        });
        navigate(`/documents/${user.defaultDocumentId}`, { replace: true });
      } else {
        toast.error('❌ No user session found. Please sign in.', {
          duration: 4000
        });
      }
    }
  }, [isAuthenticated, currentUser, navigate]);

  useEffect(() => {
    const inviteInfoRaw = localStorage.getItem("inviteInfo");
    const inviteInfo = inviteInfoRaw ? JSON.parse(inviteInfoRaw) : null;

    if (inviteInfo?.documentId === currentDocumentId) {
      toast.success('✅ Invitation processed successfully!', {
        duration: 3000,
        icon: '🎉'
      });
      localStorage.removeItem("inviteInfo");
    }
  }, [currentDocumentId]);

  useEffect(() => {
    if (currentDocumentId) {
      toast.success('✅ Workspace loaded successfully!', {
        duration: 2000,
        icon: '🚀'
      });
    }
  }, [currentDocumentId]);

  return (
    <div className="flex flex-1 h-[calc(100vh-3.5rem)]">
      <motion.div
        animate={{
          width: sidebarCollapsed ? '100%' : 'calc(100% - 400px)',
        }}
        className="flex flex-col"
      >
        <CodeEditor />
        <StatusBar />
      </motion.div>

      {!sidebarCollapsed && (
        <div className="w-[400px] border-l border-gray-200 dark:border-gray-700">
          <SidePanel />
        </div>
      )}
    </div>
  );
};
