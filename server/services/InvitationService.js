import { Invitation } from '../models/Invitation.js';
import { Collaborator } from '../models/Collaborator.js';
import { generateToken } from '../utils/tokens.js';
import { sendEmail } from '../utils/email.js';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';

class InvitationService {
  async createInvitation(documentId, email, role, invitedBy) {
    const token = generateToken();

    // Fetch inviter's name and document title for email
    const inviter = await User.findById(invitedBy);
    const document = await Document.findById(documentId);

    const invitation = await Invitation.create({
      document: documentId,
      email,
      role,
      token,
      invitedBy
    });

    // Send invitation email with inviter's name and document title
    console.log('[InvitationService] Calling sendEmail with:', {
      email,
      inviterName: inviter?.name || 'Someone',
      documentTitle: document?.title || 'Untitled Document',
      token
    });
    await sendEmail({
      email,
      inviterName: inviter?.name || 'Someone',
      documentTitle: document?.title || 'Untitled Document',
      token
    });

    return invitation;
  }

  async acceptInvitation(token, userId) {
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) throw new Error('Invalid or expired invitation');

    // Add to Collaborator collection
    await Collaborator.create({
      user: userId,
      document: invitation.document,
      role: invitation.role
    });

    // Also add to Document.collaborators array if not already present
    await Document.findByIdAndUpdate(
      invitation.document,
      {
        $addToSet: {
          collaborators: {
            user: userId,
            role: invitation.role
          }
        }
      }
    );

    invitation.status = 'accepted';
    await invitation.save();

    return { documentId: invitation.document };
  }
}

export const invitationService = new InvitationService();