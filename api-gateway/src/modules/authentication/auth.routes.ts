import { Router } from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  getCurrentUser,
  logout,
} from "./auth.controller";
import { requireAuthentication } from "../../middleware/auth.middleware";
import { tokenBucketMiddleware } from "../../middleware/token-bucket.middleware";
import oauthRoutes from "./oauth/oauth.routes";

const router = Router();

router.post("/magic-link", tokenBucketMiddleware, requestMagicLink);
router.get("/verify-magic-link", verifyMagicLink);
router.get("/me", requireAuthentication, getCurrentUser);
router.post("/logout", logout);

router.use("/oauth", oauthRoutes);

export default router;
