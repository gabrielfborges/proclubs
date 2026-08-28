import { Request, Response } from "express";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { generateGroups } from "../services/groupGenerator.service";
import { generateGroupMatches } from "../services/matchGenerator.service";
import { calculateChampionshipStandings } from "../services/standings.service";

export const listGroups = asyncHandler(async (req: Request, res: Response) => {
  const groups = await prisma.group.findMany({
    where: { championshipId: req.params.championshipId },
    include: { teams: { include: { team: true } } },
    orderBy: { name: "asc" },
  });
  res.json(groups);
});

export const createGroups = asyncHandler(async (req: Request, res: Response) => {
  const groups = await generateGroups(req.params.championshipId);
  res.status(201).json(groups);
});

export const createGroupMatches = asyncHandler(async (req: Request, res: Response) => {
  const matches = await generateGroupMatches(req.params.championshipId);
  res.status(201).json(matches);
});

export const getStandings = asyncHandler(async (req: Request, res: Response) => {
  const championship = await prisma.championship.findUnique({
    where: { id: req.params.championshipId },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  const standings = await calculateChampionshipStandings(req.params.championshipId);
  res.json(standings);
});
