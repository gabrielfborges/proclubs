import { AppError } from "../middleware/errorHandler";

type DiscordCaptain = {
  id: string;
  username: string;
  discordId: string | null;
};

type MatchForDiscord = {
  id: string;
  homeTeam: { name: string; captainUser: DiscordCaptain | null } | null;
  awayTeam: { name: string; captainUser: DiscordCaptain | null } | null;
};

type DiscordChannel = {
  id: string;
};

const DISCORD_API = "https://discord.com/api/v10";
const VIEW_CHANNEL = 1 << 10;
const SEND_MESSAGES = 1 << 11;
const READ_MESSAGE_HISTORY = 1 << 16;
const ATTACH_FILES = 1 << 15;
const EMBED_LINKS = 1 << 14;
const CAPTAIN_PERMISSIONS = String(
  VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY + ATTACH_FILES + EMBED_LINKS
);
const ADMINISTRATOR = String(1 << 3);

function envValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function requiredDiscordId(value: string | null | undefined, label: string) {
  if (!value || !/^\d{15,25}$/.test(value)) {
    throw new AppError(`${label} nao foi configurado corretamente no backend.`, 503);
  }
  return value;
}

function discordConfig() {
  const token = envValue("DISCORD_BOT_TOKEN");
  if (!token) {
    throw new AppError("O bot do Discord ainda nao foi configurado no backend.", 503);
  }

  return {
    token,
    guildId: requiredDiscordId(envValue("DISCORD_GUILD_ID"), "DISCORD_GUILD_ID"),
    categoryId: envValue("DISCORD_CATEGORY_ID")
      ? requiredDiscordId(envValue("DISCORD_CATEGORY_ID"), "DISCORD_CATEGORY_ID")
      : undefined,
    adminIds: (envValue("DISCORD_ADMIN_IDS") || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^\d{15,25}$/.test(id)),
  };
}

function captainDiscordId(captain: DiscordCaptain | null, teamName: string) {
  if (!captain) {
    throw new AppError(`O time ${teamName} precisa ter um capitao cadastrado.`, 400);
  }
  return requiredDiscordId(captain.discordId, `Discord ID do capitao de ${teamName}`);
}

function channelName(match: MatchForDiscord) {
  const home = match.homeTeam?.name || "casa";
  const away = match.awayTeam?.name || "visitante";
  const normalized = `${home}-x-${away}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return `partida-${normalized || match.id.slice(0, 8)}-${match.id.slice(0, 8)}`.slice(0, 100);
}

async function discordRequest<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${DISCORD_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      signal: init?.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Falha de rede ao acessar a API do Discord.", error);
    throw new AppError("Nao foi possivel acessar o servico do Discord agora.", 502);
  }

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    let message = "";
    let retryAfterSeconds: number | null = null;
    try {
      const body = JSON.parse(rawBody) as { message?: unknown; retry_after?: unknown };
      if (typeof body.message === "string") message = body.message;
      if (typeof body.retry_after === "number" && Number.isFinite(body.retry_after)) {
        retryAfterSeconds = body.retry_after;
      }
    } catch {
      // Mantem uma mensagem generica quando o Discord nao retornar JSON.
    }

    if (response.status === 429) {
      const headerRetryAfter = Number(response.headers.get("retry-after"));
      const retryAfter = Number.isFinite(headerRetryAfter) && headerRetryAfter > 0
        ? headerRetryAfter
        : retryAfterSeconds;
      const waitMessage = retryAfter ? ` Aguarde aproximadamente ${Math.ceil(retryAfter)} segundos.` : "";
      throw new AppError(`O Discord limitou esta operacao temporariamente.${waitMessage}`, 429);
    }

    const detail = message ? ` (${message})` : ` (HTTP ${response.status})`;
    throw new AppError(`O Discord recusou esta operacao${detail}.`, 502);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function sendMatchDiscordMessage(channelId: string, content: string) {
  const token = envValue("DISCORD_BOT_TOKEN");
  if (!token) throw new AppError("O bot do Discord ainda nao foi configurado no backend.", 503);

  const validChannelId = requiredDiscordId(channelId, "ID do canal do Discord");
  await discordRequest(token, `/channels/${validChannelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function createMatchDiscordChannel(match: MatchForDiscord) {
  const config = discordConfig();
  if (!match.homeTeam || !match.awayTeam) {
    throw new AppError("Esta partida ainda nao possui dois times definidos.", 400);
  }

  const homeCaptainId = captainDiscordId(match.homeTeam.captainUser, match.homeTeam.name);
  const awayCaptainId = captainDiscordId(match.awayTeam.captainUser, match.awayTeam.name);
  if (homeCaptainId === awayCaptainId) {
    throw new AppError("Os dois times nao podem ter o mesmo capitao nesta partida.", 400);
  }

  const botUser = await discordRequest<{ id: string }>(config.token, "/users/@me");
  const overwriteMap = new Map<string, { id: string; type: number; allow: string; deny: string }>();
  overwriteMap.set(config.guildId, {
    id: config.guildId,
    type: 0,
    allow: "0",
    deny: String(VIEW_CHANNEL),
  });

  for (const id of [homeCaptainId, awayCaptainId]) {
    overwriteMap.set(id, {
      id,
      type: 1,
      allow: CAPTAIN_PERMISSIONS,
      deny: "0",
    });
  }

  overwriteMap.set(botUser.id, {
    id: botUser.id,
    type: 1,
    allow: CAPTAIN_PERMISSIONS,
    deny: "0",
  });

  for (const id of config.adminIds) {
    overwriteMap.set(id, { id, type: 1, allow: ADMINISTRATOR, deny: "0" });
  }

  const channel = await discordRequest<DiscordChannel>(
    config.token,
    `/guilds/${config.guildId}/channels`,
    {
      method: "POST",
      body: JSON.stringify({
        name: channelName(match),
        type: 0,
        ...(config.categoryId ? { parent_id: config.categoryId } : {}),
        permission_overwrites: Array.from(overwriteMap.values()),
      }),
    }
  );

  try {
    await sendMatchDiscordMessage(
      channel.id,
      `Chat da partida **${match.homeTeam.name} x ${match.awayTeam.name}**\n` +
        `<@${homeCaptainId}> <@${awayCaptainId}>\n\n` +
        "Quando os dois capitaes confirmarem presenca, a partida estara pronta para comecar.",
    );
  } catch (error) {
    console.warn("Canal Discord criado, mas nao foi possivel enviar a mensagem inicial.", error);
  }

  return {
    id: channel.id,
    url: `https://discord.com/channels/${config.guildId}/${channel.id}`,
  };
}