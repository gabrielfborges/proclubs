import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const createSchema = z.object({
  name: z.string().min(2, "Nome do time deve ter ao menos 2 caracteres."),
  logoUrl: z.string().url().optional().or(z.literal("")),
  eaClubId: z.string().regex(/^\d+$/, "O EaClubId deve conter apenas numeros."),
  captainUserId: z.string().uuid("Selecione um usuario valido para o capitao."),
});

const updateSchema = createSchema.partial();

const selfCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome do time deve ter ao menos 2 caracteres."),
  eaClubId: z.string().regex(/^\d+$/, "O EaClubId deve conter apenas numeros."),
});

export const listTeams = asyncHandler(async (req: Request, res: Response) => {
  const teams = await prisma.team.findMany({
    where: { championshipId: req.params.championshipId },
    orderBy: { name: "asc" },
    include: { captainUser: { select: { id: true, username: true } } },
  });
  res.json(teams);
});

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const championshipId = req.params.championshipId;

  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
    include: { _count: { select: { teams: true } } },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  if (championship.stage !== "REGISTRATION") {
    throw new AppError("Nao e possivel adicionar times apos o inicio do campeonato.");
  }

  if (championship._count.teams >= championship.maxTeams) {
    throw new AppError(
      `Limite de ${championship.maxTeams} times atingido para este campeonato.`
    );
  }

  const existing = await prisma.team.findUnique({
    where: { championshipId_name: { championshipId, name: data.name } },
  });
  if (existing) {
    throw new AppError("Ja existe um time com esse nome neste campeonato.");
  }

  const captain = await prisma.user.findUnique({ where: { id: data.captainUserId } });
  if (!captain) throw new AppError("Usuario do capitao nao encontrado.", 400);

  const team = await prisma.team.create({
    data: {
      name: data.name,
      logoUrl: data.logoUrl || null,
      eaClubId: data.eaClubId,
      captainUserId: data.captainUserId,
      championshipId,
    },
  });
  res.status(201).json(team);
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) throw new AppError("Time nao encontrado.", 404);

  if (data.name && team.championshipId) {
    const existing = await prisma.team.findUnique({
      where: { championshipId_name: { championshipId: team.championshipId, name: data.name } },
    });
    if (existing && existing.id !== team.id) {
      throw new AppError("Ja existe um time com esse nome neste campeonato.");
    }
  }

  if (data.captainUserId) {
    const captain = await prisma.user.findUnique({ where: { id: data.captainUserId } });
    if (!captain) throw new AppError("Usuario do capitao nao encontrado.", 400);
  }

  const updated = await prisma.team.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      logoUrl: data.logoUrl || undefined,
      eaClubId: data.eaClubId,
      captainUserId: data.captainUserId,
    },
  });
  res.json(updated);
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: { championship: true },
  });
  if (!team) throw new AppError("Time nao encontrado.", 404);

  if (team.championship && team.championship.stage !== "REGISTRATION") {
    throw new AppError("Nao e possivel remover times apos o inicio do campeonato.");
  }

  await prisma.team.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const createOwnTeam = asyncHandler(async (req: Request, res: Response) => {
  const data = selfCreateSchema.parse(req.body);
  const captainUserId = req.user?.id;
  if (!captainUserId) throw new AppError("Usuario nao autenticado.", 401);

  const existing = await prisma.team.findFirst({
    where: { captainUserId, name: data.name, championshipId: null },
  });
  if (existing) throw new AppError("Voce ja possui um time com esse nome.");

  const team = await prisma.team.create({
    data: {
      name: data.name,
      eaClubId: data.eaClubId,
      captainUserId,
    },
    include: { captainUser: { select: { id: true, username: true } } },
  });
  res.status(201).json(team);
});
export const listOwnTeams = asyncHandler(async (req: Request, res: Response) => {
  const captainUserId = req.user?.id;
  if (!captainUserId) throw new AppError("Usuario nao autenticado.", 401);

  const teams = await prisma.team.findMany({
    where: { captainUserId },
    include: { championship: { select: { id: true, name: true, stage: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(teams);
});