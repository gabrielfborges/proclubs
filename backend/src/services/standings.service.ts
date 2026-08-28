import { prisma } from "../prisma";

export interface StandingRow {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// Calcula a classificacao de um grupo com base nas partidas ja jogadas.
// Regras: vitoria = 3 pts, empate = 1 pt, derrota = 0 pts.
// Ordenacao: pontos desc, saldo de gols desc, gols marcados desc, nome asc.
export async function calculateGroupStandings(groupId: string): Promise<StandingRow[]> {
  const groupTeams = await prisma.groupTeam.findMany({
    where: { groupId },
    include: { team: true },
  });

  const table = new Map<string, StandingRow>();
  for (const gt of groupTeams) {
    table.set(gt.teamId, {
      teamId: gt.teamId,
      teamName: gt.team.name,
      logoUrl: gt.team.logoUrl,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  const matches = await prisma.match.findMany({
    where: { groupId, status: "PLAYED" },
  });

  for (const match of matches) {
    if (
      match.homeTeamId == null ||
      match.awayTeamId == null ||
      match.homeScore == null ||
      match.awayScore == null
    ) {
      continue;
    }

    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows;
}

export async function calculateChampionshipStandings(championshipId: string) {
  const groups = await prisma.group.findMany({
    where: { championshipId },
    orderBy: { name: "asc" },
  });

  const result = [];
  for (const group of groups) {
    const standings = await calculateGroupStandings(group.id);
    result.push({ groupId: group.id, groupName: group.name, standings });
  }
  return result;
}
