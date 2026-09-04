import { prisma } from "../prisma";
import { AppError } from "../middleware/errorHandler";
import { calculateGroupStandings } from "./standings.service";

const ROUND_NAMES: Record<number, string> = {
  2: "Final",
  4: "Semifinal",
  8: "Quartas de Final",
  16: "Oitavas de Final",
  32: "16-avos de Final",
};

function roundNameForSize(size: number): string {
  return ROUND_NAMES[size] || `Fase de ${size} times`;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Verifica se todas as partidas da fase de grupos ja possuem resultado.
export async function isGroupStageComplete(championshipId: string): Promise<boolean> {
  const pending = await prisma.match.count({
    where: { championshipId, phase: "GROUP", status: "SCHEDULED" },
  });
  const total = await prisma.match.count({
    where: { championshipId, phase: "GROUP" },
  });
  return total > 0 && pending === 0;
}

// Gera a primeira fase do mata-mata a partir dos classificados de cada grupo.
// Classificados sao ordenados por grupo e posicao (1o do grupo A, 1o do B, ...
// depois 2os colocados, etc.) e emparelhados evitando, quando possivel, que
// times do mesmo grupo se enfrentem logo na primeira rodada. Caso o numero de
// classificados nao seja uma potencia de dois, os melhores colocados recebem
// "bye" (avanco automatico) na primeira rodada.
export async function generateKnockoutStage(championshipId: string) {
  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
    include: { groups: true },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  if (championship.stage === "KNOCKOUT_STAGE" || championship.stage === "FINISHED") {
    throw new AppError("O mata-mata ja foi gerado para este campeonato.");
  }

  const complete = await isGroupStageComplete(championshipId);
  if (!complete) {
    throw new AppError(
      "Ainda ha partidas da fase de grupos sem resultado. Finalize todos os jogos antes de gerar o mata-mata."
    );
  }

  const qualifyPerGroup = Math.max(1, championship.teamsQualifyingPerGroup);

  // Monta a lista de classificados: 1os colocados de todos os grupos,
  // depois 2os colocados de todos os grupos, e assim por diante.
  const byPosition: string[][] = Array.from({ length: qualifyPerGroup }, () => []);

  for (const group of championship.groups.sort((a, b) => a.name.localeCompare(b.name))) {
    const standings = await calculateGroupStandings(group.id);
    for (let pos = 0; pos < qualifyPerGroup; pos++) {
      if (standings[pos]) {
        byPosition[pos].push(standings[pos].teamId);
      }
    }
  }

  const qualifiers = byPosition.flat();

  if (qualifiers.length < 2) {
    throw new AppError("Classificados insuficientes para gerar o mata-mata.");
  }

  const bracketSize = nextPowerOfTwo(qualifiers.length);
  const byes = bracketSize - qualifiers.length;

  // Times com bye sao os melhores colocados (primeiros da lista)
  const teamsWithBye = qualifiers.slice(0, byes);
  const teamsPlaying = qualifiers.slice(byes);

  // Emparelha os que vao jogar: primeiro com ultimo, evitando mesmo grupo se possivel
  const pairs: Array<[string, string]> = [];
  let left = 0;
  let right = teamsPlaying.length - 1;
  while (left < right) {
    pairs.push([teamsPlaying[left], teamsPlaying[right]]);
    left += 1;
    right -= 1;
  }

  const roundName = roundNameForSize(bracketSize);

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { championshipId, phase: "KNOCKOUT" } });

    let order = 0;

    // times com bye avancam automaticamente: cria-se a partida ja com o time
    // definido como mandante e vencedor, sem adversario
    for (const teamId of teamsWithBye) {
      order += 1;
      await tx.match.create({
        data: {
          championshipId,
          phase: "KNOCKOUT",
          round: roundName,
          roundOrder: order,
          homeTeamId: teamId,
          awayTeamId: null,
          status: "PLAYED",
          winnerTeamId: teamId,
        },
      });
    }

    for (const [homeTeamId, awayTeamId] of pairs) {
      order += 1;
      await tx.match.create({
        data: {
          championshipId,
          phase: "KNOCKOUT",
          round: roundName,
          roundOrder: order,
          homeTeamId,
          awayTeamId,
          status: "SCHEDULED",
        },
      });
    }

    await tx.championship.update({
      where: { id: championshipId },
      data: { stage: "KNOCKOUT_STAGE" },
    });
  });

  return prisma.match.findMany({
    where: { championshipId, phase: "KNOCKOUT" },
    include: {
      homeTeam: { include: { captainUser: { select: { id: true, username: true } } } },
      awayTeam: { include: { captainUser: { select: { id: true, username: true } } } },
    },
    orderBy: { roundOrder: "asc" },
  });
}

// Gera a proxima fase do mata-mata a partir dos vencedores da rodada atual.
// So pode ser chamado quando todas as partidas da rodada atual tiverem
// resultado (ou vencedor definido por bye). Se restar apenas um vencedor,
// o campeonato e finalizado e o campeao definido automaticamente.
export async function advanceKnockoutStage(championshipId: string) {
  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
  });
  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);
  if (championship.stage !== "KNOCKOUT_STAGE") {
    throw new AppError("O campeonato nao esta na fase de mata-mata.");
  }

  const allKnockoutMatches = await prisma.match.findMany({
    where: { championshipId, phase: "KNOCKOUT" },
    orderBy: { roundOrder: "asc" },
  });

  if (allKnockoutMatches.length === 0) {
    throw new AppError("O mata-mata ainda nao foi gerado.");
  }

  const currentRound = allKnockoutMatches[allKnockoutMatches.length - 1].round;
  const currentRoundMatches = allKnockoutMatches.filter((m) => m.round === currentRound);

  const pending = currentRoundMatches.some((m) => m.status !== "PLAYED" || !m.winnerTeamId);
  if (pending) {
    throw new AppError("Ainda ha partidas da rodada atual sem resultado.");
  }

  const winners = currentRoundMatches
    .sort((a, b) => (a.roundOrder || 0) - (b.roundOrder || 0))
    .map((m) => m.winnerTeamId as string);

  if (winners.length === 1) {
    // final ja disputada: define o campeao e congela o nome para o historico
    const championTeam = await prisma.team.findUnique({
      where: { id: winners[0] },
      select: { name: true },
    });
    if (!championTeam) throw new AppError("Time campeao nao encontrado.");

    await prisma.championship.update({
      where: { id: championshipId },
      data: {
        stage: "FINISHED",
        championTeamId: winners[0],
        championTeamName: championTeam.name,
        championDefinedAt: new Date(),
      },
    });
    return { finished: true, championTeamId: winners[0] };
  }

  const roundName = roundNameForSize(winners.length);

  await prisma.$transaction(async (tx) => {
    let order = (allKnockoutMatches[allKnockoutMatches.length - 1].roundOrder || 0) * 10;
    for (let i = 0; i < winners.length; i += 2) {
      order += 1;
      await tx.match.create({
        data: {
          championshipId,
          phase: "KNOCKOUT",
          round: roundName,
          roundOrder: order,
          homeTeamId: winners[i],
          awayTeamId: winners[i + 1] ?? null,
          status: winners[i + 1] ? "SCHEDULED" : "PLAYED",
          winnerTeamId: winners[i + 1] ? null : winners[i],
        },
      });
    }
  });

  return { finished: false };
}
