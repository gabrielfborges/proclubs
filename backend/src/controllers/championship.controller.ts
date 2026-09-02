import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const createSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres."),
  description: z.string().optional(),
  maxTeams: z.number().int().min(2, "O campeonato precisa de ao menos 2 times."),
  numberOfGroups: z.number().int().min(1).default(1),
  teamsQualifyingPerGroup: z.number().int().min(1).default(2),
});

const updateSchema = createSchema.partial();

function publicStatus(stage: string): "OPEN" | "IN_PROGRESS" | "FINISHED" {
  if (stage === "REGISTRATION") return "OPEN";
  if (stage === "FINISHED") return "FINISHED";
  return "IN_PROGRESS";
}

function serialize(c: any) {
  return { ...c, status: publicStatus(c.stage) };
}

export const listChampionships = asyncHandler(async (req: Request, res: Response) => {
  const championships = await prisma.championship.findMany({
    include: {
      teams: { include: { captainUser: { select: { id: true, username: true } }, players: true } },
      championTeam: true,
      _count: { select: { teams: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(championships.map(serialize));
});

export const getChampionship = asyncHandler(async (req: Request, res: Response) => {
  const championship = await prisma.championship.findUnique({
    where: { id: req.params.id },
    include: {
      teams: { include: { captainUser: { select: { id: true, username: true } }, players: true } },
      championTeam: true,
      groups: {
        include: { teams: { include: { team: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);
  res.json(serialize(championship));
});

export const createChampionship = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const championship = await prisma.championship.create({ data });
  res.status(201).json(serialize(championship));
});

export const updateChampionship = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const championship = await prisma.championship.findUnique({ where: { id: req.params.id } });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  if (data.maxTeams) {
    const teamCount = await prisma.team.count({ where: { championshipId: championship.id } });
    if (data.maxTeams < teamCount) {
      throw new AppError(
        `Ja existem ${teamCount} times cadastrados. O limite nao pode ser menor que isso.`
      );
    }
  }

  const updated = await prisma.championship.update({
    where: { id: req.params.id },
    data,
  });
  res.json(serialize(updated));
});

export const deleteChampionship = asyncHandler(async (req: Request, res: Response) => {
  const championship = await prisma.championship.findUnique({ where: { id: req.params.id } });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  await prisma.championship.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
