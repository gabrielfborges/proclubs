import { Router } from "express";
import {
  listUsers,
  login,
  me,
  beginDiscordRegistration,
  discordCallback,
} from "../controllers/auth.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/discord/begin", beginDiscordRegistration);
router.get("/discord/callback", discordCallback);
router.get("/users", requireAdmin, listUsers);
router.get("/me", requireAuth, me);

export default router;