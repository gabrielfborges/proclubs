import { Router } from "express";
import {
  listUsers,
  login,
  me,
  register,
  beginDiscordLink,
  discordCallback,
  updateMe,
} from "../controllers/auth.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/discord/begin", requireAuth, beginDiscordLink);
router.get("/discord/callback", discordCallback);
router.get("/users", requireAdmin, listUsers);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);

export default router;
