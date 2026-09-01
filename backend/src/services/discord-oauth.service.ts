import { randomUUID } from "crypto";
import { AppError } from "../middleware/errorHandler";

const DISCORD_OAUTH_API = "https://discord.com/oauth2";
const DISCORD_TOKEN_API = "https://discord.com/api/v10/oauth2/token";
const DISCORD_API = "https://discord.com/api/v10";
const pendingLinks = new Map<
  string,
  { userId: string; expiresAt: number; processing?: boolean }
>();
// Evita que um refresh, duplo clique ou retry do proxy troque o mesmo code duas vezes.
const inFlightCodeExchanges = new Map<
  string,
  Promise<{ access_token?: string }>
>();
let discordRateLimitedUntil = 0;

export type DiscordOAuthUser = {
  id: string;
  username: string;
};

function oauthConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI?.trim() ||
    `http://localhost:${process.env.PORT || 3333}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    throw new AppError("A vinculacao com o Discord ainda nao foi configurada no backend.", 503);
  }

  return { clientId, clientSecret, frontendUrl, redirectUri };
}

export function beginDiscordLink(userId: string) {
  const config = oauthConfig();
  const now = Date.now();
  for (const [state, pending] of pendingLinks) {
    if (pending.expiresAt <= now) pendingLinks.delete(state);
  }

  const state = randomUUID();
  pendingLinks.set(state, { userId, expiresAt: now + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: "identify",
    redirect_uri: config.redirectUri,
    state,
  });

  return `${DISCORD_OAUTH_API}/authorize?${params.toString()}`;
}

async function exchangeCodeRequest(code: string) {
  const config = oauthConfig();
  if (discordRateLimitedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((discordRateLimitedUntil - Date.now()) / 1000);
    throw new AppError(
      `O Discord esta limitando temporariamente as tentativas. Aguarde aproximadamente ${remainingSeconds} segundos.`,
      429
    );
  }

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
      body: body.toString(),
    });
  } catch (error) {
    console.error("Falha de rede ao trocar o codigo OAuth do Discord.", error);
    throw new AppError("Nao foi possivel acessar o servico de autorizacao do Discord.", 502);
  }

  if (!response.ok) {
    const rawBody = await response.text();
    const contentType = response.headers.get("content-type") || "desconhecido";
    const retryAfterHeader = response.headers.get("retry-after");
    const rateLimitScope = response.headers.get("x-ratelimit-scope");
    const globalRateLimit = response.headers.get("x-ratelimit-global");
    let retryAfterSeconds: number | undefined;
    let detail = `resposta sem detalhe (HTTP ${response.status}, ${contentType})`;
    try {
      const parsed = JSON.parse(rawBody) as {
        error?: string;
        error_description?: string;
        message?: string;
        retry_after?: number;
      };
      retryAfterSeconds =
        typeof parsed.retry_after === "number" ? parsed.retry_after : undefined;
      detail =
        parsed.error_description ||
        parsed.message ||
        parsed.error ||
        detail;
    } catch {
      detail = /<(!doctype|html)/i.test(rawBody)
        ? `o servidor retornou uma pagina HTML em vez da API (HTTP ${response.status})`
        : rawBody.trim()
          ? rawBody.slice(0, 160)
          : detail;
    }

    console.error("Discord rejeitou a troca do codigo OAuth.", {
      status: response.status,
      detail,
      redirectUri: config.redirectUri,
      retryAfterHeader,
      retryAfterSeconds,
      rateLimitScope,
      globalRateLimit,
    });

    if (response.status === 429) {
      // Quando os dois valores divergem, respeitamos o maior para nao repetir
      // a requisicao antes do bloqueio real terminar.
      const headerRetryAfter = Number(retryAfterHeader);
      const retryAfterValues = [retryAfterSeconds, headerRetryAfter].filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value) && value > 0
      );
      const retryAfter = retryAfterValues.length > 0 ? Math.max(...retryAfterValues) : undefined;
      const cooldownSeconds = retryAfter ?? 60;
      discordRateLimitedUntil = Math.max(
        discordRateLimitedUntil,
        Date.now() + cooldownSeconds * 1000
      );
      const waitMessage = retryAfter
        ? ` Aguarde aproximadamente ${Math.ceil(retryAfter)} segundos.`
        : " Aguarde alguns minutos e tente novamente.";
      throw new AppError(`O Discord limitou temporariamente as tentativas.${waitMessage}`, 429);
    }

    throw new AppError(`Nao foi possivel concluir a vinculacao do Discord: ${detail}`, 502);
  }

  try {
    return (await response.json()) as { access_token?: string };
  } catch (error) {
    console.error("O Discord retornou uma resposta invalida na troca OAuth.", error);
    throw new AppError("O Discord retornou uma resposta invalida na autorizacao.", 502);
  }
}

async function exchangeCode(code: string) {
  const running = inFlightCodeExchanges.get(code);
  if (running) return running;

  const exchange = exchangeCodeRequest(code);
  inFlightCodeExchanges.set(code, exchange);
  try {
    return await exchange;
  } finally {
    if (inFlightCodeExchanges.get(code) === exchange) {
      inFlightCodeExchanges.delete(code);
    }
  }
}

export async function completeDiscordLink(state: string, code: string) {
  const config = oauthConfig();
  const pending = pendingLinks.get(state);
  if (!pending || pending.expiresAt <= Date.now()) {
    pendingLinks.delete(state);
    throw new AppError("A sessao de vinculacao do Discord expirou. Tente novamente.", 400);
  }
  if (pending.processing) {
    throw new AppError("Esta vinculacao do Discord ja esta sendo processada. Aguarde.", 409);
  }

  pending.processing = true;
  let token: { access_token?: string };
  try {
    token = await exchangeCode(code);
    if (!token.access_token) {
      throw new AppError("O Discord nao retornou um token de autorizacao.", 502);
    }
    // O code foi consumido com sucesso; a partir daqui o state nao pode ser reutilizado.
    pendingLinks.delete(state);
  } catch (error) {
    // Em caso de 429 ou falha de rede, mantemos o state valido para permitir nova tentativa.
    pending.processing = false;
    throw error;
  }

  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "FC-Pro-Clubs-Manager/1.0",
    },
  });
  if (!response.ok) {
    throw new AppError(`Nao foi possivel obter os dados da sua conta Discord (HTTP ${response.status}).`, 502);
  }

  const discordUser = (await response.json()) as { id?: string; username?: string };
  if (!discordUser.id || !discordUser.username) {
    throw new AppError("O Discord retornou dados incompletos da conta.", 502);
  }

  return { config, userId: pending.userId, discordUser: discordUser as DiscordOAuthUser };
}
