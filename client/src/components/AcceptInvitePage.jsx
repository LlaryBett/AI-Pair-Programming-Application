import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';

const AcceptInvitePage = () => {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const {
    fetchInvitationByLink,
    acceptInvitation,
    currentUser,
    setCurrentDocumentId,
    syncUserWithBackend,
  } = useAppStore();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch invite data on mount
  useEffect(() => {
    const fetchInvite = async () => {
      console.log('[AcceptInvite] Starting invite fetch...');
      setLoading(true);
      try {
        const data = await fetchInvitationByLink(inviteId);
        console.log('[AcceptInvite] Fetched invite data:', data);

        if (!data) throw new Error('Invalid or expired invitation.');

        setInvite(data);
        setCurrentDocumentId(data.documentId);
        localStorage.setItem('inviteInfo', JSON.stringify(data));

        if (currentUser && currentUser.email === data.email) {
          console.log('[AcceptInvite] Authenticated with correct email:', currentUser.email);
        } else if (currentUser && currentUser.email !== data.email) {
          console.warn('[AcceptInvite] Logged in as wrong user. Expected:', data.email, 'but got:', currentUser.email);
          setError('Please sign in with the invited email address: ' + data.email);
        } else {
          console.log('[AcceptInvite] No user logged in yet');
        }
      } catch (err) {
        console.error('[AcceptInvite] Failed to process invite:', err);
        setError(err.message || 'Failed to process invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();

    return () => {
      localStorage.removeItem('inviteInfo');
      console.log('[AcceptInvite] Cleared inviteInfo from localStorage');
    };
  }, [inviteId, fetchInvitationByLink, setCurrentDocumentId, currentUser]);

  // 🔑 Save documentId as soon as we have it
  useEffect(() => {
    if (invite?.documentId) {
      console.log('[AcceptInvite] Persisting documentId to localStorage:', invite.documentId);
      setCurrentDocumentId(invite.documentId);
      localStorage.setItem('currentDocumentId', invite.documentId);
    }
  }, [invite?.documentId]);

  const handleAccept = async () => {
    if (!invite || !currentUser) {
      console.warn('[AcceptInvite] Missing invite or current user');
      return;
    }

    if (currentUser.email !== invite.email) {
      console.warn('[AcceptInvite] Email mismatch:', currentUser.email, '!==', invite.email);
      setError('You must be signed in as ' + invite.email + ' to accept this invitation');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('[AcceptInvite] Accepting invite for:', currentUser.id, 'on doc:', invite.documentId);
      await acceptInvitation(inviteId, currentUser.id);

      const updatedUser = await syncUserWithBackend();
      console.log('[AcceptInvite] Synced user:', updatedUser);

      const docId = invite.documentId;
      setCurrentDocumentId(docId);
      localStorage.setItem('currentDocumentId', docId); // ✅ Extra safety
      localStorage.setItem('inviteInfo', JSON.stringify({ ...invite, documentId: docId }));
      sessionStorage.setItem('acceptedInviteDocId', docId);

      setAccepted(true);
      setTimeout(() => {
        console.log('[AcceptInvite] Redirecting to /documents/' + docId);
        navigate(`/documents/${docId}`);
      }, 1000);
    } catch (err) {
      console.error('[AcceptInvite] Failed to accept invite:', err);
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}>
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invitation Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="text-xl font-bold text-green-600 mb-2">Invitation Accepted!</h2>
            <p className="text-gray-700 dark:text-gray-300">Redirecting to document...</p>
            <div className="mt-4 flex justify-center">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center max-w-md w-full mx-4"
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Accept Invitation</h2>
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {invite?.invitedBy?.name || 'Someone'} invited you to collaborate on a document.
          </p>
          {invite?.role && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You'll be joining as: <span className="capitalize">{invite.role}</span>
            </p>
          )}
        </div>
        <button
          onClick={handleAccept}
          disabled={isProcessing || !currentUser}
          className={`px-6 py-3 w-full rounded-lg font-medium transition-colors ${
            isProcessing || !currentUser
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Accept Invitation'
          )}
        </button>

        {!currentUser && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Please sign in to accept this invitation.
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default AcceptInvitePage;
