import { randomUUID } from "crypto";
import { AppError } from "../middleware/errorHandler";

const DISCORD_OAUTH_API = "https://discord.com/oauth2";
const DISCORD_TOKEN_API = "https://discord.com/api/v10/oauth2/token";
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
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  let response: Response;
  try {
    response = await fetch(DISCORD_TOKEN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
        "User-Agent": "FC-Pro-Clubs-Manager/1.0",
      },
      body,
    });
  } catch (error) {
    console.error("Falha de rede ao trocar o codigo OAuth do Discord.", error);
    throw new AppError("Nao foi possivel acessar o servico de autorizacao do Discord.", 502);
  }

  if (!response.ok) {
    const rawBody = await response.text();
    let detail = "";
    try {
      const parsed = JSON.parse(rawBody) as {
        error?: string;
        error_description?: string;
        message?: string;
      };
      detail = parsed.error_description || parsed.message || parsed.error || "";
    } catch {
      detail = /<(!doctype|html)/i.test(rawBody)
        ? `o servidor retornou uma pagina HTML em vez da API (HTTP ${response.status})`
        : rawBody.slice(0, 160);
    }
    console.error("Discord rejeitou a troca do codigo OAuth.", {
      status: response.status,
      detail,
      redirectUri: config.redirectUri,
    });
    throw new AppError(
      `Nao foi possivel concluir a autorizacao do Discord${detail ? `: ${detail}` : "."}`,
      502
    );
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
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "FC-Pro-Clubs-Manager/1.0",
    },
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