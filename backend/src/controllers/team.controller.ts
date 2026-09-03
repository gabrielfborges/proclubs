import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { countApprovedChampionshipTeams, listApprovedChampionshipTeams } from "../services/championship-teams.service";

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
  const teams = await listApprovedChampionshipTeams(req.params.championshipId);
  res.json(teams);
});

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const championshipId = req.params.championshipId;

  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  if (championship.stage !== "REGISTRATION") {
    throw new AppError("Nao e possivel adicionar times apos o inicio do campeonato.");
  }

  const approvedTeamCount = await countApprovedChampionshipTeams(championshipId);
  if (approvedTeamCount >= championship.maxTeams) {
    throw new AppError(
      `Limite de ${championship.maxTeams} times atingido para este campeonato.`
    );
  }

  const existing = await prisma.championshipApplication.findFirst({
    where: { championshipId, status: "APPROVED", team: { name: data.name } },
  });
  if (existing) {
    throw new AppError("Ja existe um time com esse nome neste campeonato.");
  }

  const captain = await prisma.user.findUnique({ where: { id: data.captainUserId } });
  if (!captain) throw new AppError("Usuario do capitao nao encontrado.", 400);

  const team = await prisma.$transaction(async (tx) => {
    const createdTeam = await tx.team.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl || null,
        eaClubId: data.eaClubId,
        captainUserId: data.captainUserId,
      },
    });
    await tx.championshipApplication.create({
      data: {
        teamId: createdTeam.id,
        championshipId,
        status: "APPROVED",
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });
    return createdTeam;
  });
  res.status(201).json(team);
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) throw new AppError("Time nao encontrado.", 404);

  if (data.name) {
    const existing = await prisma.championshipApplication.findFirst({
      where: {
        status: "APPROVED",
        team: { name: data.name, id: { not: team.id } },
      },
    });
    if (existing) {
      throw new AppError("Ja existe um time com esse nome em um campeonato.");
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
    include: {
      championship: true,
      applications: {
        where: { status: "APPROVED" },
        include: { championship: true },
      },
    },
  });
  if (!team) throw new AppError("Time nao encontrado.", 404);

  const hasStartedChampionship = team.applications.some(
    (application) => application.championship.stage !== "REGISTRATION"
  );
  if (hasStartedChampionship || (team.championship && team.championship.stage !== "REGISTRATION")) {
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
    include: { captainUser: { select: { id: true, username: true } }, players: true },
  });
  res.status(201).json(team);
});
export const listOwnTeams = asyncHandler(async (req: Request, res: Response) => {
  const captainUserId = req.user?.id;
  if (!captainUserId) throw new AppError("Usuario nao autenticado.", 401);

  const teams = await prisma.team.findMany({
    where: { captainUserId },
    include: {
      championship: { select: { id: true, name: true, stage: true } },
      applications: {
        where: { status: "APPROVED" },
        include: { championship: { select: { id: true, name: true, stage: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(teams.map(({ applications, championship, ...team }) => ({
    ...team,
    championship: applications[0]?.championship ?? championship,
    championships: applications.map((application) => application.championship),
  })));
});
const selfUpdateSchema = z.object({
  name: z.string().trim().min(2, "Nome do time deve ter ao menos 2 caracteres.").optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  eaClubId: z.string().regex(/^\d+$/, "O EaClubId deve conter apenas numeros.").optional(),
});

export const updateOwnTeam = asyncHandler(async (req: Request, res: Response) => {
  const captainUserId = req.user?.id;
  if (!captainUserId) throw new AppError("Usuario nao autenticado.", 401);
  const data = selfUpdateSchema.parse(req.body);
  const team = await prisma.team.findFirst({ where: { id: req.params.id, captainUserId } });
  if (!team) throw new AppError("Time nao encontrado ou sem permissao para editar.", 404);

  if (data.name) {
    const existing = await prisma.team.findFirst({
      where: { captainUserId, name: data.name, id: { not: team.id } },
    });
    if (existing) throw new AppError("Voce ja possui um time com esse nome.", 409);
  }

  const updated = await prisma.team.update({
    where: { id: team.id },
    data: {
      name: data.name,
      logoUrl: data.logoUrl === "" ? null : data.logoUrl,
      eaClubId: data.eaClubId,
    },
    include: { championship: { select: { id: true, name: true, stage: true } } },
  });
  res.json(updated);
});