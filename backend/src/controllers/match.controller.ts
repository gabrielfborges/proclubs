import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { findLatestEaMatch, findLatestEaMatchFromPayloads } from "../services/ea-clubs.service";
import { createMatchDiscordChannel } from "../services/discord.service";

export const listMatches = asyncHandler(async (req: Request, res: Response) => {
  const { phase, groupId } = req.query;
  const matches = await prisma.match.findMany({
    where: {
      championshipId: req.params.championshipId,
      phase: phase === "KNOCKOUT" ? "KNOCKOUT" : phase === "GROUP" ? "GROUP" : undefined,
      groupId: typeof groupId === "string" ? groupId : undefined,
    },
    include: {
      homeTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      awayTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      group: true,
      playerStats: { include: { player: true }, orderBy: { player: { name: "asc" } } },
      readiness: { select: { teamId: true } },
      disputes: { include: { team: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ phase: "asc" }, { roundOrder: "asc" }],
  });
  res.json(matches.map(({ readiness, ...match }) => ({
    ...match,
    readyTeamIds: readiness.map((item) => item.teamId),
  })));
});

export const listMyMatches = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const matches = await prisma.match.findMany({
    where: {
      championshipId: req.params.championshipId,
      status: "SCHEDULED",
      OR: [
        { homeTeam: { captainUserId: userId } },
        { awayTeam: { captainUserId: userId } },
      ],
    },
    include: {
      homeTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      awayTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      group: true,
      readiness: { select: { teamId: true } },
    },
    orderBy: [{ phase: "asc" }, { roundOrder: "asc" }],
  });

  res.json(matches.map(({ readiness, ...match }) => ({
    ...match,
    myTeamId: match.homeTeam?.captainUserId === userId
      ? match.homeTeamId
      : match.awayTeamId,
    readyTeamIds: readiness.map((item) => item.teamId),
  })));
});


const scheduleSchema = z.object({
  scheduledAt: z.coerce.date().nullable(),
});

const forfeitSchema = z.object({
  winnerTeamId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

const disputeSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

const disputeResolutionSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
  resolutionNote: z.string().trim().max(1000).optional(),
});

export const scheduleMatch = asyncHandler(async (req: Request, res: Response) => {
  const { scheduledAt } = scheduleSchema.parse(req.body);
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  if (match.status === "PLAYED") throw new AppError("Nao e possivel reagendar uma partida encerrada.");

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: { scheduledAt },
    include: { homeTeam: true, awayTeam: true },
  });
  res.json(updated);
});

export const forfeitMatch = asyncHandler(async (req: Request, res: Response) => {
  const { winnerTeamId, reason } = forfeitSchema.parse(req.body);
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  if (match.status === "PLAYED") throw new AppError("Esta partida ja foi encerrada.");
  if (!match.homeTeamId || !match.awayTeamId || ![match.homeTeamId, match.awayTeamId].includes(winnerTeamId)) {
    throw new AppError("O vencedor do W.O. deve ser um dos times da partida.");
  }

  const homeWins = winnerTeamId === match.homeTeamId;
  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore: homeWins ? 3 : 0,
      awayScore: homeWins ? 0 : 3,
      homePenalty: null,
      awayPenalty: null,
      status: "PLAYED",
      resultType: homeWins ? "HOME_WALKOVER" : "AWAY_WALKOVER",
      resultNote: reason,
      winnerTeamId,
    },
    include: { homeTeam: true, awayTeam: true },
  });
  res.json(updated);
});

export const markMatchReady = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  if (match.status === "PLAYED") {
    throw new AppError("Esta partida ja foi encerrada.");
  }

  const team = [match.homeTeam, match.awayTeam].find(
    (candidate) => candidate?.captainUserId === userId
  );
  if (!team) {
    throw new AppError("Somente o capitao de um dos times pode confirmar presenca.", 403);
  }

  await prisma.matchReadiness.upsert({
    where: { matchId_teamId: { matchId: match.id, teamId: team.id } },
    update: { userId, readyAt: new Date() },
    create: { matchId: match.id, teamId: team.id, userId },
  });

  const readiness = await prisma.matchReadiness.findMany({
    where: { matchId: match.id },
    select: { teamId: true },
  });
  res.json({
    matchId: match.id,
    readyTeamIds: readiness.map((item) => item.teamId),
  });
});


export const listMatchDisputes = asyncHandler(async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  const isCaptain = [match.homeTeam, match.awayTeam].some(
    (team) => team?.captainUserId === req.user?.id
  );
  if (req.user?.role !== "ADMIN" && !isCaptain) throw new AppError("Sem permissao para consultar as disputas desta partida.", 403);

  const disputes = await prisma.matchDispute.findMany({
    where: { matchId: match.id },
    include: {
      team: true,
      openedByUser: { select: { id: true, username: true } },
      resolvedByUser: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(disputes);
});

export const openMatchDispute = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);
  const { reason } = disputeSchema.parse(req.body);
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  const team = [match.homeTeam, match.awayTeam].find((candidate) => candidate?.captainUserId === userId);
  if (!team) throw new AppError("Somente o capitao de um dos times pode abrir uma disputa.", 403);
  const existing = await prisma.matchDispute.findFirst({
    where: { matchId: match.id, teamId: team.id, status: "OPEN" },
  });
  if (existing) throw new AppError("Este time ja possui uma disputa aberta para esta partida.");

  const dispute = await prisma.matchDispute.create({
    data: { matchId: match.id, teamId: team.id, openedByUserId: userId, reason },
    include: { team: true, openedByUser: { select: { id: true, username: true } } },
  });
  res.status(201).json(dispute);
});

export const resolveMatchDispute = asyncHandler(async (req: Request, res: Response) => {
  const { status, resolutionNote } = disputeResolutionSchema.parse(req.body);
  const dispute = await prisma.matchDispute.findUnique({ where: { id: req.params.id } });
  if (!dispute) throw new AppError("Disputa nao encontrada.", 404);
  if (dispute.status !== "OPEN") throw new AppError("Esta disputa ja foi analisada.");

  const updated = await prisma.matchDispute.update({
    where: { id: dispute.id },
    data: {
      status,
      resolutionNote: resolutionNote || null,
      resolvedByUserId: req.user?.id,
      resolvedAt: new Date(),
    },
    include: {
      team: true,
      openedByUser: { select: { id: true, username: true } },
      resolvedByUser: { select: { id: true, username: true } },
    },
  });
  res.json(updated);
});

const playerStatsSchema = z.object({
  stats: z.array(z.object({
    playerId: z.string().uuid(),
    goals: z.number().int().min(0).max(99),
    assists: z.number().int().min(0).max(99),
  })).max(100),
});

async function getMatchWithTeams(id: string) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  if (!match.homeTeam || !match.awayTeam) {
    throw new AppError("Esta partida nao possui dois times definidos (bye).");
  }
  return match as typeof match & { homeTeam: NonNullable<typeof match.homeTeam>; awayTeam: NonNullable<typeof match.awayTeam> };
}

export const updateMatchPlayerStats = asyncHandler(async (req: Request, res: Response) => {
  const data = playerStatsSchema.parse(req.body);
  const match = await getMatchWithTeams(req.params.id);
  const teamIds = [match.homeTeam.id, match.awayTeam.id];
  const playerIds = data.stats.map((stat) => stat.playerId);
  const players = await prisma.player.findMany({ where: { id: { in: playerIds }, teamId: { in: teamIds } } });
  if (players.length !== new Set(playerIds).size) {
    throw new AppError("Um ou mais jogadores nao pertencem aos times desta partida.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.matchPlayerStat.deleteMany({ where: { matchId: match.id, source: "MANUAL" } });
    const manualStats = data.stats.filter((stat) => stat.goals > 0 || stat.assists > 0);
    if (manualStats.length > 0) {
      await tx.matchPlayerStat.createMany({
        data: manualStats.map((stat) => ({ ...stat, matchId: match.id, source: "MANUAL" as const })),
      });
    }
  });

  const stats = await prisma.matchPlayerStat.findMany({
    where: { matchId: match.id },
    include: { player: true },
    orderBy: { player: { name: "asc" } },
  });
  res.json(stats);
});
export const startMatch = asyncHandler(async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      homeTeam: { include: { captainUser: true } },
      awayTeam: { include: { captainUser: true } },
    },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);

  if (match.discordChannelId && match.discordChannelUrl) {
    return res.json(match);
  }

  const channel = await createMatchDiscordChannel(match);
  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      discordChannelId: channel.id,
      discordChannelUrl: channel.url,
      startedAt: new Date(),
    },
    include: {
      homeTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      awayTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      group: true,
      playerStats: { include: { player: true }, orderBy: { player: { name: "asc" } } },
    },
  });

  res.json(updated);
});
const scoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePenalty: z.number().int().min(0).optional(),
  awayPenalty: z.number().int().min(0).optional(),
});

const eaClientPayloadSchema = z.object({
  payloads: z.array(z.unknown()).min(1).max(10),
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
      resultType: "REGULAR",
      resultNote: null,
      winnerTeamId,
    },
    include: { homeTeam: true, awayTeam: true },
  });

  res.json(updated);
});

export const fetchMatchScoreFromEa = asyncHandler(async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  if (!match.homeTeam || !match.awayTeam) {
    throw new AppError("Esta partida nao possui dois times definidos (bye).");
  }
  if (!match.homeTeam.eaClubId || !match.awayTeam.eaClubId) {
    throw new AppError("Cadastre o EaClubId dos dois times antes de buscar o resultado.");
  }

  const result = await findLatestEaMatch(match.homeTeam.eaClubId, match.awayTeam.eaClubId, { scheduledAt: match.startedAt ?? match.createdAt });
  if (match.phase === "KNOCKOUT" && result.homeScore === result.awayScore) {
    throw new AppError(
      "A API da EA retornou empate. Informe os penaltis manualmente para concluir o mata-mata."
    );
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      homePenalty: null,
      awayPenalty: null,
      status: "PLAYED",
      resultType: "REGULAR",
      resultNote: null,
      winnerTeamId:
        match.phase === "KNOCKOUT"
          ? result.homeScore > result.awayScore
            ? match.homeTeamId
            : match.awayTeamId
          : null,
    },
    include: { homeTeam: true, awayTeam: true },
  });

  res.json(updated);
});
export const fetchMatchPlayerStatsFromEa = asyncHandler(async (req: Request, res: Response) => {
  const match = await getMatchWithTeams(req.params.id);
  if (!match.homeTeam.eaClubId || !match.awayTeam.eaClubId) {
    throw new AppError("Cadastre o EaClubId dos dois times antes de buscar as estatisticas.");
  }

  const result = await findLatestEaMatch(match.homeTeam.eaClubId, match.awayTeam.eaClubId, { scheduledAt: match.startedAt ?? match.createdAt });
  const players = await prisma.player.findMany({
    where: { teamId: { in: [match.homeTeam.id, match.awayTeam.id] } },
  });
  const byExternalId = new Map(players.filter((player) => player.externalId).map((player) => [player.externalId!, player]));
  const matched = result.playerStats.flatMap((stat) => {
    const player = (stat.externalId && byExternalId.get(stat.externalId)) ||
      players.find((candidate) => candidate.name.toLocaleLowerCase() === stat.name.toLocaleLowerCase());
    return player ? [{ playerId: player.id, goals: stat.goals, assists: stat.assists }] : [];
  });

  if (matched.length === 0) {
    throw new AppError("A EA retornou o placar, mas nao foi possivel identificar os jogadores. Cadastre/sincronize os jogadores e lance os dados manualmente.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.matchPlayerStat.deleteMany({ where: { matchId: match.id, source: "EA" } });
    for (const stat of matched) {
      const existing = await tx.matchPlayerStat.findUnique({ where: { matchId_playerId: { matchId: match.id, playerId: stat.playerId } } });
      if (existing?.source === "MANUAL") continue;
      await tx.matchPlayerStat.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId: stat.playerId } },
        create: { ...stat, matchId: match.id, source: "EA" },
        update: { goals: stat.goals, assists: stat.assists, source: "EA" },
      });
    }
  });

  const stats = await prisma.matchPlayerStat.findMany({ where: { matchId: match.id }, include: { player: true }, orderBy: { player: { name: "asc" } } });
  res.json(stats);
});

export const fetchMatchScoreFromEaClient = asyncHandler(async (req: Request, res: Response) => {
  const { payloads } = eaClientPayloadSchema.parse(req.body);
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) throw new AppError("Partida nao encontrada.", 404);
  if (!match.homeTeam || !match.awayTeam) {
    throw new AppError("Esta partida nao possui dois times definidos (bye).");
  }
  if (!match.homeTeam.eaClubId || !match.awayTeam.eaClubId) {
    throw new AppError("Cadastre o EaClubId dos dois times antes de buscar o resultado.");
  }

  const result = findLatestEaMatchFromPayloads(
    match.homeTeam.eaClubId,
    match.awayTeam.eaClubId,
    payloads,
    { scheduledAt: match.startedAt ?? match.createdAt }
  );
  if (match.phase === "KNOCKOUT" && result.homeScore === result.awayScore) {
    throw new AppError(
      "A API da EA retornou empate. Informe os penaltis manualmente para concluir o mata-mata."
    );
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      homePenalty: null,
      awayPenalty: null,
      status: "PLAYED",
      winnerTeamId:
        match.phase === "KNOCKOUT"
          ? result.homeScore > result.awayScore
            ? match.homeTeamId
            : match.awayTeamId
          : null,
    },
    include: { homeTeam: true, awayTeam: true },
  });

  res.json(updated);
});

export const fetchMatchPlayerStatsFromEaClient = asyncHandler(async (req: Request, res: Response) => {
  const { payloads } = eaClientPayloadSchema.parse(req.body);
  const match = await getMatchWithTeams(req.params.id);
  if (!match.homeTeam.eaClubId || !match.awayTeam.eaClubId) {
    throw new AppError("Cadastre o EaClubId dos dois times antes de buscar as estatisticas.");
  }

  const result = findLatestEaMatchFromPayloads(
    match.homeTeam.eaClubId,
    match.awayTeam.eaClubId,
    payloads,
    { scheduledAt: match.startedAt ?? match.createdAt }
  );
  const players = await prisma.player.findMany({
    where: { teamId: { in: [match.homeTeam.id, match.awayTeam.id] } },
  });
  const byExternalId = new Map(players.filter((player) => player.externalId).map((player) => [player.externalId!, player]));
  const matched = result.playerStats.flatMap((stat) => {
    const player = (stat.externalId && byExternalId.get(stat.externalId)) ||
      players.find((candidate) => candidate.name.toLocaleLowerCase() === stat.name.toLocaleLowerCase());
    return player ? [{ playerId: player.id, goals: stat.goals, assists: stat.assists }] : [];
  });

  if (matched.length === 0) {
    throw new AppError("A EA retornou o placar, mas nao foi possivel identificar os jogadores. Cadastre/sincronize os jogadores e lance os dados manualmente.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.matchPlayerStat.deleteMany({ where: { matchId: match.id, source: "EA" } });
    for (const stat of matched) {
      const existing = await tx.matchPlayerStat.findUnique({ where: { matchId_playerId: { matchId: match.id, playerId: stat.playerId } } });
      if (existing?.source === "MANUAL") continue;
      await tx.matchPlayerStat.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId: stat.playerId } },
        create: { ...stat, matchId: match.id, source: "EA" },
        update: { goals: stat.goals, assists: stat.assists, source: "EA" },
      });
    }
  });

  const stats = await prisma.matchPlayerStat.findMany({ where: { matchId: match.id }, include: { player: true }, orderBy: { player: { name: "asc" } } });
  res.json(stats);
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
      resultType: "REGULAR",
      resultNote: null,
      winnerTeamId: null,
    },
  });
  res.json(updated);
});
