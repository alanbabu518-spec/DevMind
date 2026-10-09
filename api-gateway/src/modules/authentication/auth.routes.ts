import { Router } from "express";
import { requestMagicLink } from "./auth.controller";

const router = Router();

router.post("/magic-link", requestMagicLink);

export default router;
