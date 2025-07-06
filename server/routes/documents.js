import express from 'express';
import auth from '../middleware/auth.js';
import {
  getDocument,
  getDocumentPermissions,
  createDocument,
  updateDocumentCode,
  transferOwnership
} from '../controllers/documentController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Document collection routes
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user.id },
        { "collaborators.user": req.user.id }
      ]
    })
    .populate('owner', 'name email')
    .populate('lastModifiedBy', 'name email')
    .sort({ lastModified: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/', createDocument);

// Individual document routes
router.get('/:id', getDocument);
router.patch('/:id/code', updateDocumentCode);

// Permission management
router.get('/:documentId/permissions', getDocumentPermissions);
router.post('/:documentId/transfer-ownership', transferOwnership);

// Default document endpoint
router.get('/default', async (req, res) => {
  try {
    const document = await Document.findById(req.user.defaultDocumentId);
    if (!document) {
      return res.status(404).json({ error: 'Default document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch default document' });
  }
});

export default router;