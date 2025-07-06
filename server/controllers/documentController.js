import { Document } from '../models/Document.js';
import { Collaborator } from '../models/Collaborator.js';
import { User } from '../models/User.js'; // ✅ Add this

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const hasAccess =
      document.owner.equals(req.user.id) ||
      document.collaborators.some(c => c.user.equals(req.user.id));

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Unauthorized document access',
        defaultDocumentId: req.user.defaultDocumentId
      });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

export const getDocumentPermissions = async (req, res) => {
  try {
    const collaborator = await Collaborator.findOne({
      document: req.params.documentId,
      user: req.user.id
    });

    if (!collaborator) {
      return res.status(403).json({ error: 'No access to this document' });
    }

    res.json({ role: collaborator.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createDocument = async (req, res) => {
  try {
    const document = new Document({
      name: req.body.name || 'Untitled Document',
      code: req.body.code || '',
      language: req.body.language || 'typescript',
      owner: req.user.id,
      lastModifiedBy: req.user.id,
      collaborators: [{ user: req.user.id, role: 'owner' }]
    });

    await document.save();

    await Collaborator.create({
      document: document._id,
      user: req.user.id,
      role: 'owner'
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' });
  }
};

export const updateDocumentCode = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = document.owner.equals(req.user.id);
    const isEditor = document.collaborators.some(
      c => c.user.equals(req.user.id) && c.role === 'editor'
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ error: 'You do not have permission to edit this document.' });
    }

    document.code = req.body.code;
    document.lastModified = new Date();
    document.lastModifiedBy = req.user.id;
    await document.save();

    if (req.io) {
      req.io.to(`doc-${req.params.id}`).emit('codeUpdate', {
        documentId: req.params.id,
        code: req.body.code,
        sourceUserId: req.user.id
      });
    }

    res.json(document);
  } catch (error) {
    console.error('[updateDocumentCode] Error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

export const transferOwnership = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { newOwnerId, newOwnerEmail } = req.body;

    let resolvedNewOwnerId = newOwnerId;

    // ✅ Resolve owner by email if no ID provided
    if (!resolvedNewOwnerId && newOwnerEmail) {
      const user = await User.findOne({ email: newOwnerEmail });
      if (!user) {
        return res.status(404).json({ error: 'User with that email not found' });
      }
      resolvedNewOwnerId = user._id;
    }

    if (!resolvedNewOwnerId) {
      return res.status(400).json({ error: 'newOwnerId or newOwnerEmail is required' });
    }

    const document = await Document.findOne({
      _id: documentId,
      owner: req.user.id
    });

    if (!document) {
      return res.status(403).json({ error: 'Not authorized to transfer ownership' });
    }

    // ✅ Update embedded collaborators
    document.owner = resolvedNewOwnerId;
    document.collaborators = document.collaborators.map(c =>
      c.user.equals(resolvedNewOwnerId)
        ? { ...c.toObject(), role: 'owner' }
        : c.user.equals(req.user.id)
          ? { ...c.toObject(), role: 'editor' }
          : c
    );

    await document.save();

    await Collaborator.findOneAndUpdate(
      { document: documentId, user: resolvedNewOwnerId },
      { role: 'owner' },
      { upsert: true }
    );

    await Collaborator.findOneAndUpdate(
      { document: documentId, user: req.user.id },
      { role: 'editor' }
    );

    if (req.io) {
      req.io.to(`doc-${documentId}`).emit('ownershipTransferred', {
        previousOwnerId: req.user.id,
        newOwnerId: resolvedNewOwnerId
      });
    }

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
