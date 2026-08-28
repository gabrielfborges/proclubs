import { Request, Response } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/errorHandler";
import {
  generateKnockoutStage,
  advanceKnockoutStage,
  isGroupStageComplete,
} from "../services/knockoutGenerator.service";

export const getKnockoutBracket = asyncHandler(async (req: Request, res: Response) => {
  const matches = await prisma.match.findMany({
    where: { championshipId: req.params.championshipId, phase: "KNOCKOUT" },
    include: { homeTeam: true, awayTeam: true, winnerTeam: true },
    orderBy: { roundOrder: "asc" },
  });
  res.json(matches);
});

export const getKnockoutReadiness = asyncHandler(async (req: Request, res: Response) => {
  const ready = await isGroupStageComplete(req.params.championshipId);
  res.json({ ready });
});

export const postGenerateKnockout = asyncHandler(async (req: Request, res: Response) => {
  const matches = await generateKnockoutStage(req.params.championshipId);
  res.status(201).json(matches);
});

export const postAdvanceKnockout = asyncHandler(async (req: Request, res: Response) => {
  const result = await advanceKnockoutStage(req.params.championshipId);
  res.json(result);
});
