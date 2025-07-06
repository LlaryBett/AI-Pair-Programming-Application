import express from "express";
import { 
  
  syncUser,
  validateToken,
  refreshToken 
} from "../controllers/authController.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();



// Firebase authentication
router.post("/sync-user", verifyFirebaseToken, syncUser);

// Token operations
router.get("/validate-token", validateToken);
router.post("/refresh-token", refreshToken);

export default router;