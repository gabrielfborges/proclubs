import { prisma } from "../prisma";

const teamInclude = {
  captainUser: { select: { id: true, username: true } },
  players: true,
} as const;

export async function listApprovedChampionshipTeams(championshipId: string) {
  const applications = await prisma.championshipApplication.findMany({
    where: { championshipId, status: "APPROVED" },
    include: { team: { include: teamInclude } },
    orderBy: { team: { name: "asc" } },
  });

  return applications.map((application) => application.team);
}

export async function countApprovedChampionshipTeams(championshipId: string) {
  return prisma.championshipApplication.count({
    where: { championshipId, status: "APPROVED" },
  });
}
