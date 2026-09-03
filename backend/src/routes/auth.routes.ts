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
import { rateLimit } from "../middleware/rateLimit";

const router = Router();

router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }), login)
router.post("/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Muitas tentativas de cadastro. Aguarde e tente novamente mais tarde." }), register)
router.post("/discord/begin", requireAuth, beginDiscordLink);
router.get("/discord/callback", discordCallback);
router.get("/users", requireAdmin, listUsers);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);

export default router;
