import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signAdminToken } from "../utils/jwt";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const loginSchema = z.object({
  username: z.string().min(1, "Usuario obrigatorio."),
  password: z.string().min(1, "Senha obrigatoria."),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = loginSchema.parse(req.body);

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) throw new AppError("Usuario ou senha invalidos.", 401);

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new AppError("Usuario ou senha invalidos.", 401);

  const token = signAdminToken({ id: admin.id, username: admin.username });
  res.json({ token, admin: { id: admin.id, username: admin.username } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ admin: req.admin });
});
