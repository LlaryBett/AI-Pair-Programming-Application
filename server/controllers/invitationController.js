import { Invitation } from '../models/Invitation.js';
import { Document } from '../models/Document.js';
import { User } from '../models/User.js';
import { Collaborator } from '../models/Collaborator.js';
import { sendInvitation } from '../utils/email.js';
import crypto from 'crypto';

export const invitationController = {
  /**
   * Invite collaborator to document
   */
  async inviteCollaborator(req, res) {
    try {
      const { email, role, documentId, invitedBy } = req.body;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.owner.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Only owner can invite collaborators' });
      }

      const existingCollaborator = document.collaborators.find(
        c => c.email === email || (c.user && c.user.email === email)
      );

      if (existingCollaborator) {
        return res.status(400).json({ error: 'User is already a collaborator' });
      }

      const existingInvitation = await Invitation.findOne({
        documentId,
        invitedEmail: email,
        status: 'pending'
      });

      if (existingInvitation) {
        return res.status(400).json({ error: 'Invitation already sent to this email' });
      }

      const token = crypto.randomBytes(32).toString('hex');

      const invitation = new Invitation({
        documentId,
        invitedBy: invitedBy || req.user.id,
        invitedEmail: email,
        role,
        token,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      });

      await invitation.save();

      const inviter = await User.findById(req.user.id);

      try {
        await sendInvitation({
          email,
          inviterName: inviter?.name || inviter?.email,
          documentTitle: document.title || document.name || 'Untitled Document',
          token
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }

      res.status(201).json({
        id: invitation._id,
        email: invitation.invitedEmail,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
        invitedBy: {
          name: inviter?.name,
          email: inviter?.email
        }
      });
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get pending invitations for document
   */
  async getPendingInvitations(req, res) {
    try {
      const { documentId } = req.query;

      if (!documentId) {
        return res.status(400).json({ error: 'Document ID is required' });
      }

      const invitations = await Invitation.find({
        documentId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).populate('invitedBy', 'name email');

      res.json(invitations);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(req, res) {
    try {
      const { token } = req.params;
      const { userId } = req.body;

      const invitation = await Invitation.findOne({
        token,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invalid or expired invitation' });
      }

      const acceptingUser = await User.findById(userId);
      if (!acceptingUser) {
        return res.status(400).json({ error: 'User not found' });
      }

      if (acceptingUser.email !== invitation.invitedEmail) {
        return res.status(403).json({
          error: `This invitation is for ${invitation.invitedEmail}. Please sign in with the correct email address.`
        });
      }

      const document = await Document.findById(invitation.documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Prevent owner from being added again
      if (document.owner.toString() !== userId) {
        const existingIndex = document.collaborators.findIndex(
          c => c.user?.toString() === userId
        );

        if (existingIndex >= 0) {
          document.collaborators[existingIndex].role = invitation.role;
        } else {
          document.collaborators.push({ user: userId, role: invitation.role });
        }

        await document.save();

        // ✅ Update the Collaborator collection
        await Collaborator.findOneAndUpdate(
          { document: document._id, user: userId },
          { role: invitation.role },
          { upsert: true, new: true }
        );
      }

      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();

      res.json({
        message: 'Invitation accepted successfully',
        documentId: document._id,
        role: invitation.role
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Cancel invitation
   */
  async cancelInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      const invitation = await Invitation.findById(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      const document = await Document.findById(invitation.documentId);
      if (
        document.owner.toString() !== req.user.id &&
        invitation.invitedBy.toString() !== req.user.id
      ) {
        return res.status(403).json({ error: 'Not authorized to cancel this invitation' });
      }

      invitation.status = 'cancelled';
      await invitation.save();

      res.json({ message: 'Invitation cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get invitation details by link token
   */
  async getInvitationByLink(req, res) {
    try {
      const { token } = req.params;

      const invitation = await Invitation.findOne({
        token,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })
        .populate('invitedBy', 'name email')
        .populate('documentId', 'title name');

      if (!invitation) {
        return res.status(404).json({ error: 'Invalid or expired invitation' });
      }

      res.json({
        id: invitation._id,
        email: invitation.invitedEmail,
        role: invitation.role,
        documentId: invitation.documentId._id,
        documentTitle: invitation.documentId.title || invitation.documentId.name || 'Untitled Document',
        invitedBy: invitation.invitedBy,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      });
    } catch (error) {
      console.error('Error fetching invitation by link:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export const {
  inviteCollaborator,
  getPendingInvitations,
  acceptInvitation,
  cancelInvitation,
  getInvitationByLink
} = invitationController;
