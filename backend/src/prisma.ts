import { PrismaClient } from "@prisma/client";

// Instancia unica do Prisma Client reutilizada em toda a aplicacao
export const prisma = new PrismaClient();
