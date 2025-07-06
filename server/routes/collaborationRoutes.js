import express from 'express';
const router = express.Router();

import { requireAuth } from '../middleware/auth.js';
import { invitationController } from '../controllers/invitationController.js';
import { collaboratorController } from '../controllers/collaboratorController.js';
import * as documentController from '../controllers/documentController.js';

// ================= INVITATION ROUTES =================
router.post('/invitations', requireAuth, invitationController.inviteCollaborator);
router.get('/invitations/pending', requireAuth, invitationController.getPendingInvitations);
router.get('/invitations/link/:token', invitationController.getInvitationByLink); // Public route
router.post('/invitations/:token/accept', requireAuth, invitationController.acceptInvitation);
router.post('/invitations/:invitationId/cancel', requireAuth, invitationController.cancelInvitation);

// ================= COLLABORATOR ROUTES =================
router.get('/documents/:documentId/collaborators', requireAuth, collaboratorController.getCollaborators);
router.patch('/collaborators/:id/role', requireAuth, collaboratorController.updateRole);

// ✅ New route format: DELETE /documents/:documentId/collaborators/:userId
router.delete('/documents/:documentId/collaborators/:userId', requireAuth, collaboratorController.removeCollaborator);

// ================= DOCUMENT ROUTES =================
router.get('/documents/:documentId/permissions', requireAuth, documentController.getDocumentPermissions);
router.post('/documents/:documentId/transfer-ownership', requireAuth, documentController.transferOwnership);

export { router as collaborationRoutes };
