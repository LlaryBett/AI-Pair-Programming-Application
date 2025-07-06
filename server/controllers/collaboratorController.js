import { Collaborator } from '../models/Collaborator.js';
import { Document } from '../models/Document.js';
import { User } from '../models/User.js';

export const collaboratorController = {
  /**
   * Get all collaborators for a document
   */
async getCollaborators(req, res) {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId)
      .populate('collaborators.user', 'name email avatar');

    if (!document) {
      console.log('❌ Document not found:', documentId);
      return res.status(404).json({ error: 'Document not found' });
    }

    const hasAccess =
      document.owner?.toString() === req.user.id ||
      document.collaborators?.some(c => c.user?._id?.toString() === req.user.id);

    if (!hasAccess) {
      console.log('🚫 Access denied for user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    const collaborators = document.collaborators.map(c => ({
      id: c.user._id,
      name: c.user.name,
      email: c.user.email,
      avatar: c.user.avatar,
      role: c.role,
      isOnline: false
    }));

    const responsePayload = {
      ownerId: document.owner?.toString(),
      collaborators
    };

    console.log('✅ getCollaborators response:', JSON.stringify(responsePayload, null, 2));

    res.json(responsePayload);
  } catch (error) {
    console.error('💥 Error fetching collaborators:', error);
    res.status(500).json({ error: error.message });
  }
},



  /**
   * Update collaborator role (owner only)
   */
  async updateRole(req, res) {
  try {
    const { id: userId } = req.params;
    const { role, documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Missing documentId' });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can change roles' });
    }

    const collaborator = document.collaborators.find(
      c => c.user.toString() === userId
    );

    if (!collaborator) {
      return res.status(404).json({ error: 'Collaborator not found in this document' });
    }

    if (collaborator.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Update the role in the document
    collaborator.role = role;
    await document.save();

    // Update Collaborator collection
    await Collaborator.findOneAndUpdate(
      { document: document._id, user: userId },
      { role },
      { upsert: true }
    );

    // Notify via socket
    if (req.io) {
      req.io.to(`doc-${document._id}`).emit('collaborator:role-changed', {
        userId,
        newRole: role
      });
    }

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: error.message });
  }
},

  /**
   * Remove collaborator (owner only)
   */
  async removeCollaborator(req, res) {
  try {
    const { documentId, userId } = req.params;
    const requesterId = req.user.id;

    console.log('🔍 Attempting to remove collaborator');
    console.log('📌 Target collaborator userId:', userId);
    console.log('📄 Target documentId:', documentId);
    console.log('👤 Requesting user (req.user.id):', requesterId);

    const document = await Document.findById(documentId);

    if (!document) {
      console.log('❌ Document not found.');
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log('📄 Found document:', document._id);
    console.log('👑 Document owner:', document.owner.toString());

    if (document.owner.toString() !== requesterId) {
      console.log('🚫 Requester is not the owner of the document');
      return res.status(403).json({ error: 'Only owner can remove collaborators' });
    }

    const collaborator = document.collaborators.find(
      c => c.user.toString() === userId
    );

    if (!collaborator) {
      console.log('❌ Collaborator not found in the document');
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    console.log('👤 Collaborator role:', collaborator.role);

    if (collaborator.role === 'owner') {
      console.log('⚠️ Attempted to remove the document owner themselves');
      return res.status(400).json({ error: 'Cannot remove document owner' });
    }

    document.collaborators = document.collaborators.filter(
      c => c.user.toString() !== userId
    );

    await document.save();

    // ✅ Remove from Collaborator collection
    await Collaborator.deleteOne({ document: document._id, user: userId });

    console.log(`✅ Successfully removed collaborator ${userId} from document ${document._id}`);

    if (req.io) {
      req.io.to(`user-${userId}`).emit('collaborator:removed', {
        documentId: document._id
      });

      req.io.to(`doc-${document._id}`).emit('collaborator:left', {
        userId
      });
    }

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('💥 Error removing collaborator:', error);
    res.status(500).json({ error: error.message });
  }
}


};

export const { getCollaborators, updateRole, removeCollaborator } = collaboratorController;
