import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const TEST_CHAMPIONSHIP_NAME = "Campeonato de Teste - 8 Times";
const TEST_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD || "teste123";

const testAccounts = Array.from({ length: 8 }, (_, index) => {
  const number = index + 1;

  return {
    username: `teste${number}`,
    email: `teste${number}@proclubs.local`,
    discordId: `90000000000000${number}`,
    teamName: `Time Teste ${number}`,
    eaClubId: `90000000${number}`,
  };
});

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const championship =
    (await prisma.championship.findFirst({ where: { name: TEST_CHAMPIONSHIP_NAME } })) ||
    (await prisma.championship.create({
      data: {
        name: TEST_CHAMPIONSHIP_NAME,
        description: "Campeonato criado automaticamente para testar o sistema.",
        maxTeams: 8,
        numberOfGroups: 2,
        teamsQualifyingPerGroup: 2,
        registrationFeeCents: 0,
        stage: "REGISTRATION",
      },
    }));

  for (const account of testAccounts) {
    const user = await prisma.user.upsert({
      where: { username: account.username },
      update: {
        email: account.email,
        discordId: account.discordId,
        passwordHash,
        role: "USER",
      },
      create: {
        username: account.username,
        email: account.email,
        discordId: account.discordId,
        passwordHash,
        role: "USER",
      },
    });

    const existingTeam = await prisma.team.findFirst({
      where: { captainUserId: user.id, name: account.teamName },
    });
    const team = existingTeam
      ? await prisma.team.update({
          where: { id: existingTeam.id },
          data: { eaClubId: account.eaClubId },
        })
      : await prisma.team.create({
          data: {
            name: account.teamName,
            eaClubId: account.eaClubId,
            captainUserId: user.id,
          },
        });

    await prisma.championshipApplication.upsert({
      where: {
        teamId_championshipId: {
          teamId: team.id,
          championshipId: championship.id,
        },
      },
      update: {
        status: "APPROVED",
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
      create: {
        teamId: team.id,
        championshipId: championship.id,
        status: "APPROVED",
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });
  }

  console.log(`Campeonato de teste pronto: "${championship.name}" (${championship.id})`);
  console.log("8 contas e 8 times inscritos com status APPROVED.");
  console.log(`Senha de todas as contas: ${TEST_PASSWORD}`);
  console.log("Usuarios: teste1, teste2, teste3, teste4, teste5, teste6, teste7, teste8");
  console.log("Os Discord IDs sao ficticios e servem apenas para testar o vinculo no sistema.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });