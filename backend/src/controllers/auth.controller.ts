import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { signUserToken } from "../utils/jwt";
import {
  beginDiscordLink as beginDiscordOAuth,
  completeDiscordLink,
} from "../services/discord-oauth.service";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Usuario ou email obrigatorio."),
  password: z.string().min(1, "Senha obrigatoria."),
});

const registrationSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "O usuario deve ter pelo menos 3 caracteres.")
    .max(30, "O usuario deve ter no maximo 30 caracteres.")
    .regex(/^[a-zA-Z0-9_.-]+$/, "O usuario possui caracteres invalidos."),
  email: z.string().trim().email("Informe um email valido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

function publicUser(user: {
  id: string;
  username: string;
  email: string;
  discordId: string | null;
  role: "ADMIN" | "USER";
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    discordId: user.discordId,
    role: user.role,
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const normalizedIdentifier = identifier.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: normalizedIdentifier }],
    },
  });
  if (!user) throw new AppError("Usuario ou senha invalidos.", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Usuario ou senha invalidos.", 401);

  const safeUser = publicUser(user);
  const token = signUserToken(safeUser);
  res.json({ token, user: safeUser });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registrationSchema.parse(req.body);
  const username = data.username.trim();
  const email = data.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    throw new AppError("Usuario ou email ja cadastrado.", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: "USER",
    },
  });

  res.status(201).json({ user: publicUser(user) });
});

export const beginDiscordLink = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new AppError("Usuario nao autenticado.", 401);
  const authorizationUrl = beginDiscordOAuth(req.user.id);
  res.json({ authorizationUrl });
});

export const discordCallback = asyncHandler(async (req: Request, res: Response) => {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const { code, state, error } = req.query;

  if (typeof error === "string" || typeof code !== "string" || typeof state !== "string") {
    const message = typeof error === "string" ? "A autorizacao do Discord foi cancelada." : "Resposta invalida do Discord.";
    return res.redirect(`${frontendUrl}/?discord_error=${encodeURIComponent(message)}`);
  }

  try {
    const { config, userId, discordUser } = await completeDiscordLink(state, code);
    const existing = await prisma.user.findUnique({ where: { discordId: discordUser.id } });
    if (existing && existing.id !== userId) {
      throw new AppError("Esse Discord ja esta vinculado a outra conta.", 409);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { discordId: discordUser.id },
    });

    const token = signUserToken(publicUser(user));
    return res.redirect(`${config.frontendUrl}/auth/callback#auth_token=${encodeURIComponent(token)}`);
  } catch (err) {
    const message = err instanceof AppError ? err.message : "Nao foi possivel concluir a vinculacao do Discord.";
    return res.redirect(`${frontendUrl}/?discord_error=${encodeURIComponent(message)}`);
  }
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
  });
  res.json(users.map(publicUser));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user });
});