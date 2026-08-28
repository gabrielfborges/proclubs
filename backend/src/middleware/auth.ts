import { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../utils/jwt";

// Middleware que protege as rotas administrativas.
// Exige um header "Authorization: Bearer <token>" valido.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticacao nao informado." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = verifyAdminToken(token);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
}
