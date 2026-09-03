import { prisma } from "../prisma";
import { AppError } from "../middleware/errorHandler";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function groupName(index: number): string {
  // 0 -> A, 1 -> B, ... 25 -> Z, 26 -> AA ...
  let n = index;
  let name = "";
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

// Distribui os times cadastrados de forma aleatoria e equilibrada entre os grupos.
// Sobrescreve grupos existentes (e suas partidas) para permitir sortear novamente
// enquanto nenhum resultado da fase de grupos tiver sido lancado.
export async function generateGroups(championshipId: string) {
  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
    include: {
      applications: { where: { status: "APPROVED" }, include: { team: true } },
      groups: { include: { matches: true } },
    },
  });

  if (!championship) throw new AppError("Campeonato nao encontrado.", 404);

  const teams = championship.applications.map((application) => application.team);

  if (teams.length < 2) {
    throw new AppError("E necessario pelo menos 2 times cadastrados para gerar os grupos.");
  }

  const hasPlayedMatches = championship.groups.some((g) =>
    g.matches.some((m) => m.status === "PLAYED")
  );
  if (hasPlayedMatches) {
    throw new AppError(
      "Nao e possivel gerar os grupos novamente: ja existem resultados lancados."
    );
  }

  const numberOfGroups = Math.max(1, championship.numberOfGroups);

  if (teams.length < numberOfGroups * 2) {
    throw new AppError(
      `Times insuficientes: com ${teams.length} time(s) cadastrado(s) e ${numberOfGroups} grupo(s) configurado(s), pelo menos um grupo ficaria com menos de 2 times e sem partidas. Cadastre mais times ou reduza a quantidade de grupos na edição do campeonato.`
    );
  }

  await prisma.$transaction(async (tx) => {
    // remove grupos e partidas de grupo anteriores
    await tx.match.deleteMany({ where: { championshipId, phase: "GROUP" } });
    await tx.group.deleteMany({ where: { championshipId } });

    const shuffled = shuffle(teams);
    const groups = [];
    for (let i = 0; i < numberOfGroups; i++) {
      groups.push(
        await tx.group.create({
          data: { championshipId, name: groupName(i) },
        })
      );
    }

    for (let index = 0; index < shuffled.length; index++) {
      const team = shuffled[index];
      const group = groups[index % groups.length];
      await tx.groupTeam.create({
        data: { groupId: group.id, teamId: team.id },
      });
    }

    await tx.championship.update({
      where: { id: championshipId },
      data: { stage: "GROUP_STAGE" },
    });
  });

  return prisma.group.findMany({
    where: { championshipId },
    include: { teams: { include: { team: true } } },
    orderBy: { name: "asc" },
  });
}
