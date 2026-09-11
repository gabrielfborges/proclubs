import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const messageSchema = z.object({
  content: z.string().trim().min(1, "A mensagem nao pode ficar vazia.").max(1000, "A mensagem deve ter no maximo 1000 caracteres."),
});

async function getAuthorizedMatch(matchId: string, userId: string, role: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { captainUserId: true } },
      awayTeam: { select: { captainUserId: true } },
    },
  });

  if (!match) throw new AppError("Partida nao encontrada.", 404);

  const isCaptain = [match.homeTeam?.captainUserId, match.awayTeam?.captainUserId].includes(userId);
  if (role !== "ADMIN" && !isCaptain) {
    throw new AppError("Somente os capitaes da partida e administradores podem acessar este chat.", 403);
  }

  return match;
}

export const listMatchChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const match = await getAuthorizedMatch(req.params.id, userId, req.user?.role || "USER");
  const messages = await prisma.matchChatMessage.findMany({
    where: { matchId: match.id },
    include: { user: { select: { id: true, username: true, role: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  res.json({
    matchId: match.id,
    locked: match.status === "PLAYED",
    messages,
  });
});

export const sendMatchChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const { content } = messageSchema.parse(req.body);
  const match = await getAuthorizedMatch(req.params.id, userId, req.user?.role || "USER");
  if (match.status === "PLAYED") {
    throw new AppError("O chat desta partida foi encerrado junto com a partida.", 400);
  }

  const message = await prisma.matchChatMessage.create({
    data: { matchId: match.id, userId, content },
    include: { user: { select: { id: true, username: true, role: true } } },
  });

  res.status(201).json(message);
});