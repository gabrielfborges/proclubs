import { AppError } from "../middleware/errorHandler";

const EA_API_BASE_URL = "https://proclubs.ea.com/api/fc";
const EA_PLATFORM = process.env.EA_PLATFORM || "common-gen5";
const MATCH_TYPES = ["friendlyMatch", "leagueMatch", "playoffMatch"] as const;

type JsonObject = { [key: string]: unknown };

export interface EaMatchResult {
  homeScore: number;
  awayScore: number;
  timestamp: number;
}

export interface EaPlayerResult {
  name: string;
  externalId: string | null;
  position: string | null;
}

export interface EaClubSearchResult {
  clubId: string;
  name: string;
  regionId: string | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecordArray(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.filter(isObject);
  if (!isObject(value)) return [];
  return Object.values(value).filter(isObject);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function firstValue(record: JsonObject, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function getClubId(record: JsonObject): string | null {
  return asId(firstValue(record, ["clubId", "clubID", "club_id", "id"]));
}

function getTimestamp(record: JsonObject): number {
  const raw = firstValue(record, ["timestamp", "matchTimestamp", "date", "matchDate"]);
  const numeric = asNumber(raw);
  if (numeric !== null) return numeric > 10_000_000_000 ? numeric / 1000 : numeric;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed / 1000;
  }
  return 0;
}

function getMatchRecords(payload: unknown): JsonObject[] {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];

  for (const key of ["matches", "matchHistory", "data", "results"]) {
    if (payload[key] !== undefined) return asRecordArray(payload[key]);
  }
  if (payload.clubs !== undefined || payload.matchId !== undefined) return [payload];

  return Object.values(payload).filter(isObject);
}

function getClubs(record: JsonObject): JsonObject[] {
  for (const key of ["clubs", "club", "teams"]) {
    if (record[key] !== undefined) return asRecordArray(record[key]);
  }

  const clubs: JsonObject[] = [];
  for (const key of ["homeClub", "awayClub", "homeTeam", "awayTeam"]) {
    if (isObject(record[key])) clubs.push(record[key]);
  }
  return clubs;
}

function getScore(record: JsonObject): number | null {
  return asNumber(
    firstValue(record, ["goals", "score", "goalsFor", "goalsScored", "homeGoals", "awayGoals"])
  );
}

function hasClub(record: JsonObject, clubId: string): boolean {
  const clubs = getClubs(record);
  if (clubs.some((club) => getClubId(club) === clubId)) return true;

  return ["homeClubId", "awayClubId", "homeTeamId", "awayTeamId"]
    .map((key) => asId(record[key]))
    .includes(clubId);
}

function getScoreFromTopLevel(record: JsonObject, side: "home" | "away"): number | null {
  return asNumber(
    firstValue(
      record,
      side === "home"
        ? ["homeScore", "homeGoals", "homeClubScore", "goalsHome"]
        : ["awayScore", "awayGoals", "awayClubScore", "goalsAway"]
    )
  );
}

function parseMatch(
  record: JsonObject,
  homeClubId: string,
  awayClubId: string
): EaMatchResult | null {
  if (!hasClub(record, homeClubId) || !hasClub(record, awayClubId)) return null;

  const clubs = getClubs(record);
  const homeClub = clubs.find((club) => getClubId(club) === homeClubId);
  const awayClub = clubs.find((club) => getClubId(club) === awayClubId);

  let homeScore = homeClub ? getScore(homeClub) : null;
  let awayScore = awayClub ? getScore(awayClub) : null;

  homeScore ??= homeClub ? asNumber(homeClub["goalsFor"]) : null;
  awayScore ??= awayClub ? asNumber(awayClub["goalsFor"]) : null;
  homeScore ??= getScoreFromTopLevel(record, "home");
  awayScore ??= getScoreFromTopLevel(record, "away");

  if (homeScore === null && homeClub) {
    awayScore ??= asNumber(firstValue(homeClub, ["goalsAgainst", "opponentScore"]));
  }
  if (awayScore === null && awayClub) {
    homeScore ??= asNumber(firstValue(awayClub, ["goalsAgainst", "opponentScore"]));
  }

  if (homeScore === null || awayScore === null) return null;

  return {
    homeScore: Math.max(0, Math.trunc(homeScore)),
    awayScore: Math.max(0, Math.trunc(awayScore)),
    timestamp: getTimestamp(record),
  };
}

async function fetchMatchType(
  clubId: string,
  matchType: (typeof MATCH_TYPES)[number]
): Promise<unknown> {
  const url = new URL(`${EA_API_BASE_URL}/clubs/matches`);
  url.searchParams.set("platform", EA_PLATFORM);
  url.searchParams.set("clubIds", clubId);
  url.searchParams.set("matchType", matchType);
  url.searchParams.set("maxResultCount", "10");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      "sec-fetch-site": "same-origin",
      referer: "https://www.ea.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`EA API returned ${response.status}`);
  return response.json();
}

export async function findLatestEaMatch(
  homeClubId: string,
  awayClubId: string
): Promise<EaMatchResult> {
  const responses = await Promise.allSettled(
    MATCH_TYPES.map((matchType) => fetchMatchType(homeClubId, matchType))
  );
  const results: EaMatchResult[] = [];

  for (const response of responses) {
    if (response.status !== "fulfilled") continue;
    for (const record of getMatchRecords(response.value)) {
      const parsed = parseMatch(record, homeClubId, awayClubId);
      if (parsed) results.push(parsed);
    }
  }

  results.sort((a, b) => b.timestamp - a.timestamp);
  if (!results[0]) {
    throw new AppError(
      "Nao foi encontrado um resultado recente entre esses dois clubes na API da EA. Confira os EaClubIds e se a partida ja foi registrada no jogo."
    );
  }
  return results[0];
}

function getSearchRecords(payload: unknown): JsonObject[] {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];

  for (const key of ["clubs", "results", "data", "entries"]) {
    if (payload[key] !== undefined) {
      const records = asRecordArray(payload[key]);
      if (records.length > 0) return records;
    }
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    if (!isObject(value)) return [];
    return [{ ...value, clubId: getClubId(value) || key }];
  });
}

function getClubName(record: JsonObject): string | null {
  const value = firstValue(record, ["clubName", "name", "club_name", "title"]);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOptionalNumber(record: JsonObject, keys: string[]): number | null {
  const value = asNumber(firstValue(record, keys));
  return value === null ? null : Math.max(0, Math.trunc(value));
}

export async function searchEaClubs(clubName: string): Promise<EaClubSearchResult[]> {
  const searchPaths = ["allTimeLeaderboard/search", "currentSeasonLeaderboard/search"];
  let response: Response | null = null;

  for (const searchPath of searchPaths) {
    const url = new URL(`${EA_API_BASE_URL}/${searchPath}`);
    url.searchParams.set("platform", EA_PLATFORM);
    url.searchParams.set("clubName", clubName);
    url.searchParams.set("maxResultCount", "50");

    try {
      const candidate = await fetch(url, {
        headers: {
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          referer: "https://www.ea.com/",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (candidate.ok) {
        response = candidate;
        break;
      }
    } catch {
      // Tenta o endpoint alternativo antes de informar indisponibilidade.
    }
  }

  if (!response) {
    throw new AppError("A busca de clubes da EA esta indisponivel no momento. Tente novamente mais tarde.", 502);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AppError("A EA retornou uma resposta invalida para a busca do clube.", 502);
  }

  const unique = new Map<string, EaClubSearchResult>();
  for (const record of getSearchRecords(payload)) {
    const clubId = getClubId(record);
    const name = getClubName(record);
    if (!clubId || !name || unique.has(clubId)) continue;

    unique.set(clubId, {
      clubId,
      name,
      regionId: asId(firstValue(record, ["regionId", "regionID", "region"])),
      wins: getOptionalNumber(record, ["wins", "winCount"]),
      draws: getOptionalNumber(record, ["draws", "drawCount"]),
      losses: getOptionalNumber(record, ["losses", "lossCount"]),
    });
  }

  return [...unique.values()].slice(0, 50);
}
function getPlayerRecords(payload: unknown): JsonObject[] {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];
  if (payload.members !== undefined) return asRecordArray(payload.members);
  return Object.values(payload).filter(isObject);
}

function getPlayerName(record: JsonObject): string | null {
  const value = firstValue(record, ["name", "playername", "playerName", "proName", "gamertag"]);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPlayerExternalId(record: JsonObject): string | null {
  return asId(firstValue(record, ["playerId", "playerID", "blazeId", "personaId"]));
}

function getPlayerPosition(record: JsonObject): string | null {
  const value = firstValue(record, ["proPos", "position", "favoritePosition", "pos"]);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function fetchMembersEndpoint(
  clubId: string,
  endpoint: "members/career/stats" | "members/stats"
) {
  const url = new URL(EA_API_BASE_URL + "/" + endpoint);
  url.searchParams.set("platform", EA_PLATFORM);
  url.searchParams.set("clubId", clubId);
  if (endpoint === "members/stats") url.searchParams.set("seasonId", "current");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      referer: "https://www.ea.com/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("EA API returned " + response.status);
  return response.json();
}

export async function syncEaClubPlayers(clubId: string): Promise<EaPlayerResult[]> {
  let payload: unknown;
  try {
    payload = await fetchMembersEndpoint(clubId, "members/career/stats");
  } catch {
    payload = await fetchMembersEndpoint(clubId, "members/stats");
  }

  const unique = new Map<string, EaPlayerResult>();
  for (const record of getPlayerRecords(payload)) {
    const name = getPlayerName(record);
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (unique.has(key)) continue;
    unique.set(key, {
      name,
      externalId: getPlayerExternalId(record),
      position: getPlayerPosition(record),
    });
  }
  return [...unique.values()];
}