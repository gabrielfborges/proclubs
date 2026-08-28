import { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticacao nao informado." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = verifyUserToken(token);
    if (!payload.id || !payload.role) {
      return res.status(401).json({ message: "Token invalido ou expirado." });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Acesso restrito a administradores." });
    }
    next();
  });
}