import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const email = process.env.ADMIN_EMAIL || "admin@proclubs.local";
  const discordId = process.env.ADMIN_DISCORD_ID || "admin";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        ...(existing.email.startsWith("legacy-") ? { email } : {}),
        ...(existing.discordId.startsWith("legacy-") ? { discordId } : {}),
      },
    });
    console.log(`Usuario "${username}" ja existe e esta como administrador.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username, email, discordId, passwordHash, role: "ADMIN" },
  });

  console.log(`Administrador "${username}" criado com sucesso.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });