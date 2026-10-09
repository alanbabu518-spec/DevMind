import { Router } from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  getCurrentUser,
  logout,
} from "./auth.controller";
import { requireAuthentication } from "../../middleware/auth.middleware";

const router = Router();

router.post("/magic-link", requestMagicLink);
router.get("/verify-magic-link", verifyMagicLink);
router.get("/me", requireAuthentication, getCurrentUser);
router.post("/logout", logout);

export default router;
