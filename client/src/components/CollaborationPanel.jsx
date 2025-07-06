import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Mail, Copy, Check, X, 
  Crown, Edit3, Eye, MoreVertical, Shield, UserX, AlertCircle 
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

// Extracted components
const CollaboratorItem = React.memo(({ 
  collaborator, 
  currentUserId, 
  onRoleChange, 
  onRemove, 
  canManage 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor': return <Edit3 className="w-4 h-4 text-green-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-blue-500" />;
      default: return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const isCurrentUser = collaborator.id === currentUserId;

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: collaborator.color || '#4f46e5' }}>
          {collaborator.avatar ? (
            <img
              src={collaborator.avatar}
              alt={collaborator.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          <span className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
            {collaborator.name
              ? collaborator.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              : collaborator.email
                ? collaborator.email[0].toUpperCase()
                : 'U'}
          </span>
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${collaborator.isOnline ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white dark:border-gray-700`} />
        </div>
        
        <div>
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {collaborator.name}
              {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(You)</span>}
            </p>
            {getRoleIcon(collaborator.role)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {collaborator.email} • {collaborator.role}
          </p>
        </div>
      </div>

      {canManage && !isCurrentUser && (
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10"
              >
                <div className="p-1">
                  {collaborator.role !== 'editor' && (
                    <button
                      onClick={() => {
                        onRoleChange('editor');
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Make Editor</span>
                    </button>
                  )}
                  
                  {collaborator.role !== 'viewer' && (
                    <button
                      onClick={() => {
                        onRoleChange('viewer');
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Make Viewer</span>
                    </button>
                  )}
                  
                  <hr className="my-1 border-gray-200 dark:border-gray-600" />
                  
                  <button
                    onClick={() => {
                      onRemove();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

const TransferOwnershipModal = ({ 
  isOpen, 
  onClose, 
  collaborators, 
  currentUser, 
  documentId 
}) => {
  const [transferEmail, setTransferEmail] = useState('');
  const { transferDocumentOwnership } = useAppStore();

  // Filter collaborators that can become owners (exclude current owner)
  const eligibleCollaborators = collaborators.filter(c => 
    c.role !== 'owner' && c.id !== currentUser?.id
  );

  const handleTransfer = useCallback(async () => {
    if (!transferEmail.trim()) {
      toast.error('Please select a collaborator to transfer ownership to');
      return;
    }
    
    try {
      toast.loading('Transferring ownership...', { id: 'transfer-ownership' });
      await transferDocumentOwnership(documentId, transferEmail);
      toast.dismiss('transfer-ownership');
      toast.success('👑 Ownership transferred successfully!', {
        duration: 4000,
        icon: '🎉'
      });
      onClose();
      setTransferEmail('');
    } catch (error) {
      toast.dismiss('transfer-ownership');
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`❌ Failed to transfer ownership: ${errorMessage}`, {
        duration: 4000
      });
    }
  }, [transferEmail, documentId, transferDocumentOwnership, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Transfer Ownership
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Transferring ownership will make you an editor on this document. You won't be able to undo this action.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transfer to:
              </label>
              {eligibleCollaborators.length === 0 ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No eligible collaborators found. You need to invite collaborators first.
                  </p>
                </div>
              ) : (
                <select
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a collaborator</option>
                  {eligibleCollaborators.map(collaborator => (
                    <option key={collaborator.id} value={collaborator.email}>
                      {collaborator.name} ({collaborator.email}) - {collaborator.role}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferEmail.trim() || eligibleCollaborators.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Transfer Ownership
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const InviteSection = ({ 
  inviteEmail, 
  inviteRole, 
  isInviting, 
  copiedLink, 
  pendingInvitations, 
  documentId,
  onInviteEmailChange,
  onInviteRoleChange,
  onInvite,
  onCopyLink
}) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
      Invite Collaborators
    </h3>
    
    <div className="flex space-x-3">
      <div className="flex-1">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => onInviteEmailChange(e.target.value)}
          placeholder="Enter email address..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <select
        value={inviteRole}
        onChange={(e) => onInviteRoleChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onInvite}
        disabled={isInviting || !inviteEmail.trim()}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {isInviting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        <span>Invite</span>
      </motion.button>
    </div>

    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Quick Invite Link
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Share this link to invite collaborators
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCopyLink}
        className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg transition-colors"
      >
        {copiedLink ? (
          <>
            <Check className="w-4 h-4" />
            <span className="text-sm">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span className="text-sm">Copy Link</span>
          </>
        )}
      </motion.button>
    </div>
  </div>
);

const PendingInvitationsList = ({ invitations, documentId }) => {
  const { cancelInvitation } = useAppStore();

  const handleCancelInvitation = async (invitationId) => {
    try {
      toast.loading('Canceling invitation...', { id: 'cancel-invitation' });
      await cancelInvitation(invitationId, documentId);
      toast.dismiss('cancel-invitation');
      toast.success('✅ Invitation canceled successfully!', {
        duration: 3000,
        icon: '🗑️'
      });
    } catch (error) {
      toast.dismiss('cancel-invitation');
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`❌ Failed to cancel invitation: ${errorMessage}`, {
        duration: 4000
      });
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Pending Invitations
      </h3>
      {invitations.map((invitation) => {
        const key = invitation.id || invitation._id || invitation.email;
        return (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {invitation.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Invited as {invitation.role} • {
                    invitation.createdAt
                      ? new Date(invitation.createdAt).toLocaleDateString()
                      : ""
                  }
                </p>
                {invitation.invitedBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Invited by: {
                      typeof invitation.invitedBy === 'object'
                        ? (invitation.invitedBy.email || invitation.invitedBy.name || JSON.stringify(invitation.invitedBy))
                        : invitation.invitedByEmail || invitation.invitedBy
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCancelInvitation(invitation.id || invitation._id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CollaboratorsList = ({ 
  collaborators, 
  currentUserId, 
  isOwner, 
  documentId,
  onTransferClick 
}) => {
  const { removeCollaborator, updateCollaboratorRole } = useAppStore();

  const handleRoleChange = useCallback(async (userId, newRole) => {
    try {
      toast.loading('Updating role...', { id: 'update-role' });
      await updateCollaboratorRole(userId, newRole, documentId);
      toast.dismiss('update-role');
      toast.success(`🎯 Role updated to ${newRole} successfully!`, {
        duration: 3000,
        icon: '✅'
      });
    } catch (error) {
      toast.dismiss('update-role');
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`❌ Failed to update role: ${errorMessage}`, {
        duration: 4000
      });
    }
  }, [documentId, updateCollaboratorRole]);

  const handleRemove = useCallback(async (userId) => {
    try {
      toast.loading('Removing collaborator...', { id: 'remove-collaborator' });
      await removeCollaborator(userId, documentId);
      toast.dismiss('remove-collaborator');
      toast.success('👋 Collaborator removed successfully!', {
        duration: 3000,
        icon: '🗑️'
      });
    } catch (error) {
      toast.dismiss('remove-collaborator');
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`❌ Failed to remove collaborator: ${errorMessage}`, {
        duration: 4000
      });
    }
  }, [documentId, removeCollaborator]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Active Collaborators ({collaborators.length})
        </h3>
        {isOwner && (
          <button
            onClick={onTransferClick}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Transfer Ownership
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {collaborators.map((collaborator) => (
          <CollaboratorItem
            key={collaborator.id}
            collaborator={collaborator}
            currentUserId={currentUserId}
            onRoleChange={(role) => handleRoleChange(collaborator.id, role)}
            onRemove={() => handleRemove(collaborator.id)}
            canManage={isOwner && collaborator.role !== 'owner'}
          />
        ))}
      </div>
    </div>
  );
};

export const CollaborationPanel = ({ isOpen, onClose }) => {
  const {
    collaborators,
    currentUser,
    inviteCollaborator,
    pendingInvitations,
    socket,
    currentDocumentId,
    setCurrentDocumentId
  } = useAppStore();

  const [localState, setLocalState] = useState({
    inviteEmail: '',
    inviteRole: 'editor',
    isInviting: false,
    copiedLink: false,
    showTransferModal: false
  });

  // Safe collaborators check with logging
  const safeCollaborators = Array.isArray(collaborators) ? collaborators : [];
  
  // Debug logging
  console.log("Collaborators from store:", collaborators);
  console.log("Safe collaborators:", safeCollaborators);

  const isOwner = useMemo(() => {
    const owner = safeCollaborators.find(c => c.role === 'owner');
    return owner?.id === currentUser?.id;
  }, [safeCollaborators, currentUser]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleCollaboratorUpdate = (updatedCollaborators) => {
      useAppStore.getState().setCollaborators(updatedCollaborators);
    };

    const handleDocumentCollaboratorsUpdate = ({ collaborators }) => {
      useAppStore.getState().setCollaborators(collaborators);
    };

    socket.on('collaboratorsUpdated', handleCollaboratorUpdate);
    socket.on('document:collaborators:update', handleDocumentCollaboratorsUpdate);

    return () => {
      socket.off('collaboratorsUpdated', handleCollaboratorUpdate);
      socket.off('document:collaborators:update', handleDocumentCollaboratorsUpdate);
    };
  }, [socket, isOpen]);

  // Data loading - Fixed to properly extract collaborators array
  useEffect(() => {
    if (isOpen && currentDocumentId) {
      const loadCollaborationData = async () => {
        try {
          toast.loading('Loading collaboration data...', { id: 'load-collaboration' });
          
          // Load collaborators
          const colabResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${currentDocumentId}/collaborators`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (colabResponse.ok) {
            const collaboratorsData = await colabResponse.json();
            console.log('[CollaborationPanel] Raw API response:', collaboratorsData);
            
            // 🔥 Fix: Extract only the collaborators array from the response
            const collaboratorsArray = collaboratorsData.collaborators || collaboratorsData;
            console.log('[CollaborationPanel] Extracted collaborators:', collaboratorsArray);
            
            useAppStore.getState().setCollaborators(collaboratorsArray);
          } else {
            const errorData = await colabResponse.json();
            throw new Error(errorData.error || errorData.message || 'Failed to load collaborators');
          }

          // Load pending invitations
          const inviteResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invitations/pending?documentId=${currentDocumentId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (inviteResponse.ok) {
            const invitationsData = await inviteResponse.json();
            useAppStore.getState().setPendingInvitations(invitationsData);
          } else {
            const errorData = await inviteResponse.json();
            throw new Error(errorData.error || errorData.message || 'Failed to load pending invitations');
          }
          
          toast.dismiss('load-collaboration');
          toast.success('📋 Collaboration data loaded!', {
            duration: 2000,
            icon: '👥'
          });
        } catch (error) {
          toast.dismiss('load-collaboration');
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
          toast.error(`❌ Failed to load collaboration data: ${errorMessage}`, {
            duration: 4000
          });
        }
      };

      loadCollaborationData();
    }
  }, [isOpen, currentDocumentId]);

  const handleInvite = useCallback(async () => {
    if (!localState.inviteEmail.trim()) {
      toast.error('📧 Please enter an email address', {
        duration: 3000
      });
      return;
    }

    if (!currentDocumentId) {
      toast.error('❌ No document selected', {
        duration: 3000
      });
      return;
    }

    setLocalState(prev => ({ ...prev, isInviting: true }));
    toast.loading(`Sending invitation to ${localState.inviteEmail}...`, { id: 'send-invite' });

    try {
      await inviteCollaborator(localState.inviteEmail, localState.inviteRole, currentDocumentId);
      setLocalState(prev => ({ ...prev, inviteEmail: '' }));
      toast.dismiss('send-invite');
      toast.success(`📨 Invitation sent to ${localState.inviteEmail}!`, {
        duration: 4000,
        icon: '✅'
      });
    } catch (error) {
      toast.dismiss('send-invite');
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`❌ Failed to send invitation: ${errorMessage}`, {
        duration: 4000
      });
    } finally {
      setLocalState(prev => ({ ...prev, isInviting: false }));
    }
  }, [localState.inviteEmail, localState.inviteRole, currentDocumentId, inviteCollaborator]);

  const copyInviteLink = useCallback(async () => {
    try {
      const inviteId = pendingInvitations.length > 0
        ? (pendingInvitations[pendingInvitations.length - 1]._id || pendingInvitations[pendingInvitations.length - 1].id)
        : currentDocumentId;

      const inviteLink = `${window.location.origin}/invite/${inviteId}`;
      await navigator.clipboard.writeText(inviteLink);
      setLocalState(prev => ({ ...prev, copiedLink: true }));
      toast.success('🔗 Invite link copied to clipboard!', {
        duration: 3000,
        icon: '📋'
      });
      setTimeout(() => setLocalState(prev => ({ ...prev, copiedLink: false })), 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error occurred';
      toast.error(`❌ Failed to copy invite link: ${errorMessage}`, {
        duration: 3000
      });
    }
  }, [pendingInvitations, currentDocumentId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Collaboration</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage who can edit your code
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <InviteSection
              inviteEmail={localState.inviteEmail}
              inviteRole={localState.inviteRole}
              isInviting={localState.isInviting}
              copiedLink={localState.copiedLink}
              pendingInvitations={pendingInvitations}
              documentId={currentDocumentId}
              onInviteEmailChange={(email) => setLocalState(prev => ({ ...prev, inviteEmail: email }))}
              onInviteRoleChange={(role) => setLocalState(prev => ({ ...prev, inviteRole: role }))}
              onInvite={handleInvite}
              onCopyLink={copyInviteLink}
            />

            <PendingInvitationsList 
              invitations={pendingInvitations} 
              documentId={currentDocumentId}
            />

            <CollaboratorsList 
              collaborators={safeCollaborators}
              currentUserId={currentUser?.id}
              isOwner={isOwner}
              documentId={currentDocumentId}
              onTransferClick={() => setLocalState(prev => ({ ...prev, showTransferModal: true }))}
            />
          </div>
        </motion.div>
        
        {/* Transfer Ownership Modal */}
        <TransferOwnershipModal
          isOpen={localState.showTransferModal}
          onClose={() => setLocalState(prev => ({ ...prev, showTransferModal: false }))}
          collaborators={safeCollaborators}
          currentUser={currentUser}
          documentId={currentDocumentId}
        />
      </div>
    </AnimatePresence>
  );
};