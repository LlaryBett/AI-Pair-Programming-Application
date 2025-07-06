import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { invitationController } from '../controllers/invitationController.js';

const router = express.Router();

router.post('/', requireAuth, invitationController.inviteCollaborator);
router.get('/pending', requireAuth, invitationController.getPendingInvitations);
router.post('/:token/accept', requireAuth, invitationController.acceptInvitation);

export default router;
export { router as invitationRoutes };
