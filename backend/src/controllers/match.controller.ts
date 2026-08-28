import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";

export const listMatches = asyncHandler(async (req: Request, res: Response) => {
  const { phase, groupId } = req.query;
  const matches = await prisma.match.findMany({
    where: {
      championshipId: req.params.championshipId,
      phase: phase === "KNOCKOUT" ? "KNOCKOUT" : phase === "GROUP" ? "GROUP" : undefined,
      groupId: typeof groupId === "string" ? groupId : undefined,
    },
    include: { homeTeam: true, awayTeam: true, group: true },
    orderBy: [{ phase: "asc" }, { roundOrder: "asc" }],
  });
  res.json(matches);
});

const scoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePenalty: z.number().int().min(0).optional(),
  awayPenalty: z.number().int().min(0).optional(),
});

export const updateMatchScore = asyncHandler(async (req: Request, res: Response) => {
  const data = scoreSchema.parse(req.body);
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) throw new AppError("Partida nao encontrada.", 404);

  if (!match.homeTeamId || !match.awayTeamId) {
    throw new AppError("Esta partida nao possui dois times definidos (bye).");
  }

  let winnerTeamId: string | null = null;

  if (match.phase === "KNOCKOUT") {
    if (data.homeScore === data.awayScore) {
      if (data.homePenalty == null || data.awayPenalty == null) {
        throw new AppError(
          "Em caso de empate no mata-mata, informe o resultado dos penaltis."
        );
      }
      if (data.homePenalty === data.awayPenalty) {
        throw new AppError("O resultado dos penaltis nao pode terminar empatado.");
      }
      winnerTeamId = data.homePenalty > data.awayPenalty ? match.homeTeamId : match.awayTeamId;
    } else {
      winnerTeamId = data.homeScore > data.awayScore ? match.homeTeamId : match.awayTeamId;
    }
  }

  const updated = await prisma.match.update({
    where: { id: req.params.id },
    data: {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      homePenalty: data.homePenalty ?? null,
      awayPenalty: data.awayPenalty ?? null,
      status: "PLAYED",
      winnerTeamId,
    },
    include: { homeTeam: true, awayTeam: true },
  });

  res.json(updated);
});

export const resetMatchScore = asyncHandler(async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) throw new AppError("Partida nao encontrada.", 404);

  const updated = await prisma.match.update({
    where: { id: req.params.id },
    data: {
      homeScore: null,
      awayScore: null,
      homePenalty: null,
      awayPenalty: null,
      status: "SCHEDULED",
      winnerTeamId: null,
    },
  });
  res.json(updated);
});
