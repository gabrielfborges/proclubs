import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signUserToken } from "../utils/jwt";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Usuario ou email obrigatorio."),
  password: z.string().min(1, "Senha obrigatoria."),
});

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "O usuario deve ter pelo menos 3 caracteres.")
    .max(30, "O usuario deve ter no maximo 30 caracteres.")
    .regex(/^[a-zA-Z0-9_.-]+$/, "O usuario possui caracteres invalidos."),
  email: z.string().trim().email("Informe um email valido."),
  discordId: z.string().trim().min(2, "Informe seu Discord ID.").max(64, "Discord ID muito longo."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

function publicUser(user: {
  id: string;
  username: string;
  email: string;
  discordId: string;
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
  const data = registerSchema.parse(req.body);
  const username = data.username.trim();
  const email = data.email.trim().toLowerCase();
  const discordId = data.discordId.trim();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }, { discordId }] },
  });
  if (existing) {
    throw new AppError("Usuario, email ou Discord ID ja cadastrado.", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { username, email, discordId, passwordHash, role: "USER" },
  });

  res.status(201).json({ user: publicUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user });
});