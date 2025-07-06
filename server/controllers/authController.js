import mongoose from 'mongoose';
import { User } from "../models/User.js";
import { Document } from "../models/Document.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Helper to create a guaranteed unique document for a user
async function createUserDocument(userId, name = "User") {
  return await Document.create({
    title: `${name}'s Document`,
    content: "",
    owner: userId,
    collaborators: [{
      user: userId,
      role: 'owner'
    }]
  });
}

export const authController = {
  /**
   * Sync user with Firebase data
   */
  syncUser: async (req, res) => {
    try {
      const {
        uid,
        email,
        name,
        firebase: {
          sign_in_provider = "password"
        } = {}
      } = req.firebaseUser;

      if (!email) {
        return res.status(400).json({ message: "No email provided" });
      }

      // Normalize auth method to match enum ["EMAIL", "GOOGLE", "GITHUB"]
      const normalizedAuthMethod = sign_in_provider.toUpperCase().split('.')[0];

      // Optional: Log auth method
      console.log("[Auth] Normalized auth method:", normalizedAuthMethod);

      // Find or create user
      let user = await User.findOne({
        $or: [{ firebaseUid: uid }, { email }]
      });

      const isNewUser = !user;
      if (!user) {
        user = await User.create({
          firebaseUid: uid,
          email,
          name: name || email.split('@')[0],
          authMethod: normalizedAuthMethod,
          role: "user"
        });
      }

      // Create default document if new user or no document set
      let document;
      if (isNewUser || !user.defaultDocumentId) {
        document = await createUserDocument(user._id, user.name);
        user.defaultDocumentId = document._id;
        await user.save();
      } else {
        document = await Document.findById(user.defaultDocumentId);
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d"
      });

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          defaultDocumentId: document._id
        }
      });

    } catch (err) {
      console.error("Sync error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Validate JWT token - as route handler
   */
  validateToken: async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ valid: false, message: 'Server configuration error' });
    }

    try {
      jwt.verify(token, jwtSecret);
      res.json({ valid: true });
    } catch (err) {
      res.status(401).json({ valid: false, message: 'Invalid token' });
    }
  },

  /**
   * JWT middleware for protected routes
   */
  validateTokenMiddleware: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ valid: false });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ valid: false, message: "Server configuration error" });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ valid: false });
    }
  },

  /**
   * Refresh JWT token
   */
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtRefreshSecret || !jwtSecret) {
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "Invalid user" });
      }

      const newToken = jwt.sign({ id: user._id }, jwtSecret, {
        expiresIn: "7d"
      });

      res.json({
        token: newToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });

    } catch (err) {
      res.status(401).json({ message: "Invalid refresh token" });
    }
  },
};

// Export individual functions for compatibility
export const { syncUser, refreshToken, validateToken, validateTokenMiddleware } = authController;
