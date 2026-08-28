import { Router } from "express";
import { listUsers, login, me, register } from "../controllers/auth.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/users", requireAdmin, listUsers);
router.get("/me", requireAuth, me);

export default router;