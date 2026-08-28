import { prisma } from "../prisma";
import { AppError } from "../middleware/errorHandler";

// Gera as partidas de todos os grupos (turno unico: cada time enfrenta
// todos os outros do seu grupo uma vez), usando o metodo do circulo para
// distribuir os confrontos em rodadas equilibradas.
export async function generateGroupMatches(championshipId: string) {
  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
    include: {
      groups: { include: { teams: { include: { team: true } }, matches: true } },
    },
  });

  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);
  if (championship.groups.length === 0) {
    throw new AppError("Gere os grupos antes de gerar as partidas.");
  }

  const hasPlayedMatches = championship.groups.some((g) =>
    g.matches.some((m) => m.status === "PLAYED")
  );
  if (hasPlayedMatches) {
    throw new AppError(
      "Nao e possivel gerar as partidas novamente: ja existem resultados lancados."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { championshipId, phase: "GROUP" } });

    for (const group of championship.groups) {
      const teamIds = group.teams.map((gt) => gt.teamId);
      if (teamIds.length < 2) continue;

      const rounds = roundRobinPairs(teamIds);
      let roundOrder = 0;
      for (const round of rounds) {
        for (const [homeTeamId, awayTeamId] of round) {
          roundOrder += 1;
          await tx.match.create({
            data: {
              championshipId,
              phase: "GROUP",
              groupId: group.id,
              round: `Rodada ${roundOrder}`,
              roundOrder,
              homeTeamId,
              awayTeamId,
              status: "SCHEDULED",
            },
          });
        }
      }
    }
  });

  return prisma.match.findMany({
    where: { championshipId, phase: "GROUP" },
    include: { homeTeam: true, awayTeam: true, group: true },
    orderBy: [{ groupId: "asc" }, { roundOrder: "asc" }],
  });
}

// Algoritmo do circulo (round-robin) classico: gera pares para cada rodada
// de um turno unico. Se o numero de times for impar, adiciona um "bye" (null).
function roundRobinPairs(teamIds: string[]): Array<Array<[string, string]>> {
  const ids: (string | null)[] = [...teamIds];
  if (ids.length % 2 !== 0) ids.push(null);

  const n = ids.length;
  const totalRounds = n - 1;
  const half = n / 2;
  const rounds: Array<Array<[string, string]>> = [];

  let arr = [...ids];
  for (let round = 0; round < totalRounds; round++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== null && b !== null) {
        // alterna mandante/visitante para nao favorecer sempre o mesmo lado
        pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rounds.push(pairs);

    // rotaciona todos menos o primeiro elemento
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string | null);
    arr = [fixed, ...rest];
  }

  return rounds;
}
