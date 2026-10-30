import { Router } from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  getCurrentUser,
  logout,
  completeOnboarding,
} from "./auth.controller";
import { requireAuthentication } from "../../middleware/auth.middleware";
import { tokenBucketMiddleware } from "../../middleware/token-bucket.middleware";
import oauthRoutes from "./oauth/oauth.routes";
import {
  checkUsername,
  deleteAccount,
  updateProfile,
} from "./profile.controller";

const router = Router();

router.post("/magic-link", tokenBucketMiddleware, requestMagicLink);
router.get("/verify-magic-link", verifyMagicLink);
router.get("/me", requireAuthentication, getCurrentUser);
router.get("/username-available", requireAuthentication, checkUsername);
router.patch("/profile", requireAuthentication, updateProfile);
router.delete("/account", requireAuthentication, deleteAccount);
router.post("/logout", logout);
router.post("/onboarding/complete", requireAuthentication, completeOnboarding);

router.use("/oauth", oauthRoutes);

export default router;
