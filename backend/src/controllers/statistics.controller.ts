import { Request, Response } from "express";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { prisma } from "../prisma";

type Ranking = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals?: number;
  assists?: number;
};

export const getChampionshipStatistics = asyncHandler(async (req: Request, res: Response) => {
  const championship = await prisma.championship.findUnique({ where: { id: req.params.championshipId } });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  const stats = await prisma.matchPlayerStat.findMany({
    where: { match: { championshipId: championship.id, status: "PLAYED" } },
    include: { player: { include: { team: true } } },
  });
  const aggregate = new Map<string, Ranking>();
  for (const stat of stats) {
    const current = aggregate.get(stat.playerId) || {
      playerId: stat.playerId,
      playerName: stat.player.name,
      teamId: stat.player.teamId,
      teamName: stat.player.team.name,
      goals: 0,
      assists: 0,
    };
    current.goals = (current.goals || 0) + stat.goals;
    current.assists = (current.assists || 0) + stat.assists;
    aggregate.set(stat.playerId, current);
  }

  const rows = [...aggregate.values()];
  res.json({
    scorers: rows.map(({ assists, ...row }) => ({ ...row, goals: row.goals || 0 })).sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName)).slice(0, 20),
    assisters: rows.map(({ goals, ...row }) => ({ ...row, assists: row.assists || 0 })).sort((a, b) => b.assists - a.assists || a.playerName.localeCompare(b.playerName)).slice(0, 20),
  });
});