import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import {
  listChampionships,
  getChampionship,
  createChampionship,
  updateChampionship,
  deleteChampionship,
} from "../controllers/championship.controller";
import { listTeams, createTeam, updateTeam, deleteTeam } from "../controllers/team.controller";
import {
  listGroups,
  createGroups,
  createGroupMatches,
  getStandings,
} from "../controllers/group.controller";
import {
  listMatches,
  updateMatchScore,
  resetMatchScore,
  fetchMatchScoreFromEa,
} from "../controllers/match.controller";
import {
  getKnockoutBracket,
  getKnockoutReadiness,
  postGenerateKnockout,
  postAdvanceKnockout,
} from "../controllers/knockout.controller";

const router = Router();

// --- Campeonatos (publico para GET, admin para escrita) ---
router.get("/", listChampionships);
router.get("/:id", getChampionship);
router.post("/", requireAdmin, createChampionship);
router.patch("/:id", requireAdmin, updateChampionship);
router.delete("/:id", requireAdmin, deleteChampionship);

// --- Times ---
router.get("/:championshipId/teams", listTeams);
router.post("/:championshipId/teams", requireAdmin, createTeam);
router.patch("/teams/:id", requireAdmin, updateTeam);
router.delete("/teams/:id", requireAdmin, deleteTeam);

// --- Grupos e classificacao ---
router.get("/:championshipId/groups", listGroups);
router.post("/:championshipId/groups/generate", requireAdmin, createGroups);
router.post("/:championshipId/matches/generate", requireAdmin, createGroupMatches);
router.get("/:championshipId/standings", getStandings);

// --- Partidas ---
router.get("/:championshipId/matches", listMatches);
router.patch("/matches/:id/score", requireAdmin, updateMatchScore);
router.post("/matches/:id/score/ea", requireAdmin, fetchMatchScoreFromEa);
router.post("/matches/:id/reset", requireAdmin, resetMatchScore);

// --- Mata-mata ---
router.get("/:championshipId/knockout", getKnockoutBracket);
router.get("/:championshipId/knockout/ready", getKnockoutReadiness);
router.post("/:championshipId/knockout/generate", requireAdmin, postGenerateKnockout);
router.post("/:championshipId/knockout/advance", requireAdmin, postAdvanceKnockout);

export default router;
