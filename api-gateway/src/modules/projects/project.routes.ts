import { Router } from "express";
import { requireAuthentication } from "../../middleware/auth.middleware";
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} from "./project.controller";

const router = Router();

router.use(requireAuthentication);

router.post("/", createProject);
router.get("/", listProjects);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
