import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { countApprovedChampionshipTeams } from "../services/championship-teams.service";

const requestSchema = z.object({
  teamId: z.string().uuid("Selecione um time valido."),
});

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const listMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const applications = await prisma.championshipApplication.findMany({
    where: { team: { captainUserId: userId } },
    include: {
      team: true,
      championship: { select: { id: true, name: true, stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(applications);
});

export const listChampionshipApplications = asyncHandler(async (req: Request, res: Response) => {
  const championship = await prisma.championship.findUnique({
    where: { id: req.params.championshipId },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  const applications = await prisma.championshipApplication.findMany({
    where: { championshipId: championship.id },
    include: {
      team: { include: { captainUser: { select: { id: true, username: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  res.json(applications);
});

export const requestChampionshipApplication = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const { teamId } = requestSchema.parse(req.body);
  const championshipId = req.params.championshipId;
  const [team, championship, approvedTeamCount] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.championship.findUnique({
      where: { id: championshipId },
    }),
    countApprovedChampionshipTeams(championshipId),
  ]);

  if (!team) throw new AppError("Time nao encontrado.", 404);
  if (team.captainUserId !== userId) throw new AppError("Somente o capitao pode solicitar a inscricao deste time.", 403);
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);
  if (championship.stage !== "REGISTRATION") throw new AppError("Este campeonato nao esta aceitando inscricoes.");
  if (approvedTeamCount >= championship.maxTeams) throw new AppError("Este campeonato ja atingiu o limite de times.");

  const existing = await prisma.championshipApplication.findUnique({
    where: { teamId_championshipId: { teamId, championshipId } },
  });
  if (existing?.status === "PENDING") throw new AppError("Ja existe uma solicitacao pendente para este campeonato.");
  if (existing?.status === "APPROVED") throw new AppError("Este time ja foi aprovado neste campeonato.");

  const application = existing
    ? await prisma.championshipApplication.update({
        where: { id: existing.id },
        data: { status: "PENDING", reviewedAt: null, approvedAt: null },
        include: { team: true, championship: { select: { id: true, name: true, stage: true } } },
      })
    : await prisma.championshipApplication.create({
        data: { teamId, championshipId },
        include: { team: true, championship: { select: { id: true, name: true, stage: true } } },
      });

  res.status(201).json(application);
});

export const reviewChampionshipApplication = asyncHandler(async (req: Request, res: Response) => {
  const { status } = reviewSchema.parse(req.body);
  const applicationId = req.params.id;

  const application = await prisma.championshipApplication.findUnique({
    where: { id: applicationId },
    include: { team: true, championship: true },
  });
  if (!application) throw new AppError("Solicitacao nao encontrada.", 404);
  if (application.status !== "PENDING") throw new AppError("Esta solicitacao ja foi analisada.");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Championship" WHERE "id" = ${application.championshipId} FOR UPDATE`;
    if (status === "REJECTED") {
      return tx.championshipApplication.update({
        where: { id: applicationId },
        data: { status, reviewedAt: new Date(), approvedAt: null },
        include: { team: { include: { captainUser: { select: { id: true, username: true } } } } },
      });
    }

    if (application.championship.stage !== "REGISTRATION") {
      throw new AppError("Este campeonato nao esta aceitando novas inscricoes.");
    }
    const teamCount = await tx.championshipApplication.count({
      where: { championshipId: application.championshipId, status: "APPROVED" },
    });
    if (teamCount >= application.championship.maxTeams) {
      throw new AppError("Nao ha mais vagas neste campeonato.");
    }
    await tx.championshipApplication.updateMany({
      where: { teamId: application.teamId, status: "PENDING", id: { not: applicationId } },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });

    return tx.championshipApplication.update({
      where: { id: applicationId },
      data: { status, reviewedAt: new Date(), approvedAt: new Date() },
      include: { team: { include: { captainUser: { select: { id: true, username: true } } } } },
    });
  });

  res.json(updated);
});