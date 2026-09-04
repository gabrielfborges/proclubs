import { Request, Response } from "express";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { prisma } from "../prisma";

type Ranking = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
};

export const getChampionshipStatistics = asyncHandler(async (req: Request, res: Response) => {
  const championship = await prisma.championship.findUnique({
    where: { id: req.params.championshipId },
    select: { id: true },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  const [stats, totalMatches, playedMatches] = await Promise.all([
    prisma.matchPlayerStat.findMany({
      where: { match: { championshipId: championship.id, status: "PLAYED" } },
      include: { player: { include: { team: true } } },
    }),
    prisma.match.count({ where: { championshipId: championship.id } }),
    prisma.match.findMany({
      where: { championshipId: championship.id, status: "PLAYED" },
      select: { homeScore: true, awayScore: true },
    }),
  ]);

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
    current.goals += stat.goals;
    current.assists += stat.assists;
    aggregate.set(stat.playerId, current);
  }

  const rows = [...aggregate.values()];
  const scorers = rows
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName))
    .slice(0, 20);
  const assisters = rows
    .filter((row) => row.assists > 0)
    .sort((a, b) => b.assists - a.assists || a.playerName.localeCompare(b.playerName))
    .slice(0, 20);

  res.json({
    summary: {
      totalMatches,
      playedMatches: playedMatches.length,
      totalGoals: playedMatches.reduce(
        (total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0),
        0
      ),
      totalAssists: stats.reduce((total, stat) => total + stat.assists, 0),
      playersWithStats: rows.length,
    },
    scorers,
    assisters,
  });
});
