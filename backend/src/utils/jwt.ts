import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-secret")
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h"
if (!JWT_SECRET) throw new Error("JWT_SECRET precisa ser configurado em produção.")

export type UserRole = "ADMIN" | "USER";

export interface UserTokenPayload {
  id: string;
  username: string;
  email: string;
  discordId: string | null;
  role: UserRole;
}

export function signUserToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyUserToken(token: string): UserTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET!)
  if (!decoded || typeof decoded !== "object") throw new Error("Token inválido.")
  const payload = decoded as Partial<UserTokenPayload>
  if (typeof payload.id !== "string" || typeof payload.username !== "string" || typeof payload.email !== "string" || (payload.role !== "ADMIN" && payload.role !== "USER")) throw new Error("Token inválido.")
  return { id: payload.id, username: payload.username, email: payload.email, discordId: typeof payload.discordId === "string" ? payload.discordId : null, role: payload.role }
}
