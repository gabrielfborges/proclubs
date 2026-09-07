import "dotenv/config";
import { createApp } from "./app";
import { prisma } from "./prisma";

const app = createApp();
const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`API rodando na porta ${PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Recebido ${signal}. Encerrando a API...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

