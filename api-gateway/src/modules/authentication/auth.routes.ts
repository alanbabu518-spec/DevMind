import { Router } from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  getCurrentUser,
  logout,
} from "./auth.controller";
import { requireAuthentication } from "../../middleware/auth.middleware";
import { tokenBucketMiddleware } from "../../middleware/token-bucket.middleware";

const router = Router();
router.post("/magic-link", tokenBucketMiddleware, requestMagicLink);
router.get("/verify-magic-link", verifyMagicLink);
router.get("/me", requireAuthentication, getCurrentUser);
router.post("/logout", logout);

export default router;
