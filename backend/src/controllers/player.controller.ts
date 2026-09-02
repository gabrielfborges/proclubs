import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { syncEaClubPlayers } from "../services/ea-clubs.service";

const playerSchema = z.object({
  name: z.string().trim().min(2, "O nome do jogador deve ter ao menos 2 caracteres.").max(80),
  externalId: z.string().trim().max(200).optional().or(z.literal("")),
  position: z.string().trim().max(30).optional().or(z.literal("")),
});
const syncPlayersSchema = z.object({
  players: z.array(playerSchema).max(200),
});

async function getAccessibleTeam(req: Request) {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) throw new AppError("Time nao encontrado.", 404);

  if (req.user?.role !== "ADMIN" && team.captainUserId !== req.user?.id) {
    throw new AppError("Somente o capitao pode editar este time.", 403);
  }
  return team;
}

export const listTeamPlayers = asyncHandler(async (req: Request, res: Response) => {
  await getAccessibleTeam(req);
  const players = await prisma.player.findMany({
    where: { teamId: req.params.id },
    orderBy: [{ isManual: "asc" }, { name: "asc" }],
  });
  res.json(players);
});

export const createTeamPlayer = asyncHandler(async (req: Request, res: Response) => {
  await getAccessibleTeam(req);
  const data = playerSchema.parse(req.body);
  const existing = await prisma.player.findUnique({
    where: { teamId_name: { teamId: req.params.id, name: data.name } },
  });
  if (existing) throw new AppError("Ja existe um jogador com esse nome neste time.", 409);

  const player = await prisma.player.create({
    data: {
      teamId: req.params.id,
      name: data.name,
      externalId: data.externalId || null,
      position: data.position || null,
      isManual: true,
    },
  });
  res.status(201).json(player);
});

export const deleteTeamPlayer = asyncHandler(async (req: Request, res: Response) => {
  const team = await getAccessibleTeam(req);
  const player = await prisma.player.findFirst({
    where: { id: req.params.playerId, teamId: team.id },
  });
  if (!player) throw new AppError("Jogador nao encontrado.", 404);

  await prisma.player.delete({ where: { id: player.id } });
  res.status(204).send();
});

async function persistSyncedPlayers(teamId: string, remotePlayers: Array<{ name: string; externalId?: string | null; position?: string | null }>) {
  let added = 0;
  let updated = 0;

  for (const remote of remotePlayers) {
    const existing = await prisma.player.findUnique({
      where: { teamId_name: { teamId, name: remote.name } },
    });

    if (!existing) {
      await prisma.player.create({
        data: {
          teamId,
          name: remote.name,
          externalId: remote.externalId || null,
          position: remote.position || null,
          isManual: false,
        },
      });
      added += 1;
    } else if (!existing.isManual) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { externalId: remote.externalId || null, position: remote.position || null },
      });
      updated += 1;
    }
  }

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: [{ isManual: "asc" }, { name: "asc" }],
  });
  return { players, added, updated, remoteCount: remotePlayers.length };
}

export const syncTeamPlayers = asyncHandler(async (req: Request, res: Response) => {
  const team = await getAccessibleTeam(req);
  if (!team.eaClubId) throw new AppError("Cadastre um EaClubId antes de sincronizar os jogadores.", 400);

  try {
    const remotePlayers = await syncEaClubPlayers(team.eaClubId);
    res.json(await persistSyncedPlayers(team.id, remotePlayers));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Nao foi possivel sincronizar os jogadores com a EA agora. Tente novamente mais tarde.", 502);
  }
});

export const syncTeamPlayersFromClient = asyncHandler(async (req: Request, res: Response) => {
  const team = await getAccessibleTeam(req);
  const { players } = syncPlayersSchema.parse(req.body);
  res.json(await persistSyncedPlayers(team.id, players));
});