import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Collaborator } from "../models/Collaborator.js";
import { Document } from "../models/Document.js";

// Middleware to authenticate request and attach user object
export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 FIXED: use decoded.id instead of decoded.user_id
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = {
      ...user.toObject(),
      id: user._id.toString(),   // ✅ This matches what your controllers expect
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid session token" });
  }
};



// Lightweight alternative that just attaches user ID
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ Unified access check: owner OR collaborator
export const checkDocumentAccess = async (userId, documentId) => {
  console.log("[checkDocumentAccess] userId:", userId);
  console.log("[checkDocumentAccess] documentId:", documentId);
  const document = await Document.findById(documentId);
  console.log("[checkDocumentAccess] found document:", document);
  if (!document) {
    console.warn(`[AUTH] Document not found: ${documentId}`);
    return false;
  }

  // Check ownership
  if (document.owner.toString() === userId.toString()) return true;

  // Check if user is a collaborator
  const collaborator = await Collaborator.findOne({ user: userId, document: documentId });
  return !!collaborator;
};

// ✅ Require owner (checks Document.owner)
export const requireOwner = async (req, res, next) => {
  const { documentId } = req.params;
  const document = await Document.findById(documentId);
  if (!document || document.owner.toString() !== req.user.user_id) {
    return res.status(403).json({ error: "Owner permission required" });
  }
  next();
};

// ✅ Require editor or owner
export const requireEditor = async (req, res, next) => {
  const { documentId } = req.params;

  const document = await Document.findById(documentId);
  if (!document) return res.status(404).json({ error: "Document not found" });

  // Owner is always an editor
  if (document.owner.toString() === req.user.user_id) {
    return next();
  }

  const collaborator = await Collaborator.findOne({
    document: documentId,
    user: req.user.user_id,
    role: { $in: ["owner", "editor"] },
  });

  if (!collaborator) {
    return res.status(403).json({ error: "Editor permission required" });
  }

  next();
};

export default auth;
