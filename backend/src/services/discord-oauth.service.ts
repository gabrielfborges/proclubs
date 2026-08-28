import { randomUUID } from "crypto";
import { AppError } from "../middleware/errorHandler";

const DISCORD_OAUTH_API = "https://discord.com/api/oauth2";
const DISCORD_API = "https://discord.com/api/v10";
const pendingRegistrations = new Map<
  string,
  { username: string; email: string; passwordHash: string; expiresAt: number }
>();

export type DiscordRegistrationData = {
  username: string;
  email: string;
  passwordHash: string;
};

export type DiscordOAuthUser = {
  id: string;
  username: string;
};

function oauthConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 3333}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    throw new AppError("A vinculacao com o Discord ainda nao foi configurada no backend.", 503);
  }

  return { clientId, clientSecret, frontendUrl, redirectUri };
}

export function beginDiscordRegistration(data: DiscordRegistrationData) {
  const config = oauthConfig();
  const now = Date.now();
  for (const [state, pending] of pendingRegistrations) {
    if (pending.expiresAt <= now) pendingRegistrations.delete(state);
  }

  const state = randomUUID();
  pendingRegistrations.set(state, { ...data, expiresAt: now + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: "identify",
    redirect_uri: config.redirectUri,
    state,
    prompt: "consent",
  });

  return `${DISCORD_OAUTH_API}/authorize?${params.toString()}`;
}

async function exchangeCode(code: string) {
  const config = oauthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(`${DISCORD_OAUTH_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new AppError("Nao foi possivel concluir a autorizacao do Discord.", 502);
  }

  return (await response.json()) as { access_token?: string };
}

export async function completeDiscordRegistration(state: string, code: string) {
  const config = oauthConfig();
  const pending = pendingRegistrations.get(state);
  pendingRegistrations.delete(state);
  if (!pending || pending.expiresAt <= Date.now()) {
    throw new AppError("A sessao de vinculacao do Discord expirou. Tente novamente.", 400);
  }

  const token = await exchangeCode(code);
  if (!token.access_token) {
    throw new AppError("O Discord nao retornou um token de autorizacao.", 502);
  }

  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!response.ok) {
    throw new AppError("Nao foi possivel obter os dados da sua conta Discord.", 502);
  }

  const discordUser = (await response.json()) as { id?: string; username?: string };
  if (!discordUser.id || !discordUser.username) {
    throw new AppError("O Discord retornou dados incompletos da conta.", 502);
  }

  return { config, pending, discordUser: discordUser as DiscordOAuthUser };
}