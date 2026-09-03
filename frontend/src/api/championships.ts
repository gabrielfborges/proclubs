import axios from "axios";
import { api } from "./client";
import { Championship, ChampionshipApplication, EaClubSearchResult, Group, GroupStandings, Match, Player, Team, User, UserTeam, ChampionshipStatistics, MatchPlayerStat } from "../types";

export async function fetchChampionships() {
  const { data } = await api.get<Championship[]>("/championships");
  return data;
}

export async function fetchChampionship(id: string) {
  const { data } = await api.get<Championship>(`/championships/${id}`);
  return data;
}

export interface ChampionshipInput {
  name: string;
  description?: string;
  maxTeams: number;
  numberOfGroups: number;
  teamsQualifyingPerGroup: number;
}

export async function createChampionshipRequest(input: ChampionshipInput) {
  const { data } = await api.post<Championship>("/championships", input);
  return data;
}

export async function updateChampionshipRequest(id: string, input: Partial<ChampionshipInput>) {
  const { data } = await api.patch<Championship>(`/championships/${id}`, input);
  return data;
}

export async function deleteChampionshipRequest(id: string) {
  await api.delete(`/championships/${id}`);
}

export async function fetchUsersRequest() {
  const { data } = await api.get<User[]>("/auth/users");
  return data;
}
export async function fetchTeams(championshipId: string) {
  const { data } = await api.get<Team[]>(`/championships/${championshipId}/teams`);
  return data;
}

export async function createTeamRequest(
  championshipId: string,
  input: { name: string; logoUrl?: string; eaClubId: string; captainUserId: string }
) {
  const { data } = await api.post<Team>(`/championships/${championshipId}/teams`, input);
  return data;
}

export async function deleteTeamRequest(teamId: string) {
  await api.delete(`/championships/teams/${teamId}`);
}

export async function fetchGroups(championshipId: string) {
  const { data } = await api.get<Group[]>(`/championships/${championshipId}/groups`);
  return data;
}

export async function generateGroupsRequest(championshipId: string) {
  const { data } = await api.post<Group[]>(`/championships/${championshipId}/groups/generate`);
  return data;
}

export async function generateMatchesRequest(championshipId: string) {
  const { data } = await api.post<Match[]>(`/championships/${championshipId}/matches/generate`);
  return data;
}

export async function fetchStandings(championshipId: string) {
  const { data } = await api.get<GroupStandings[]>(`/championships/${championshipId}/standings`);
  return data;
}

export async function fetchMatches(championshipId: string, phase?: "GROUP" | "KNOCKOUT") {
  const { data } = await api.get<Match[]>(`/championships/${championshipId}/matches`, {
    params: phase ? { phase } : undefined,
  });
  return data;
}

export async function fetchMyChampionshipMatchesRequest(championshipId: string) {
  const { data } = await api.get<Match[]>(`/championships/${championshipId}/matches/mine`);
  return data;
}

export async function scheduleMatchRequest(matchId: string, scheduledAt: string | null) {
  const { data } = await api.patch<Match>("/championships/matches/" + matchId + "/schedule", { scheduledAt });
  return data;
}

export async function forfeitMatchRequest(matchId: string, winnerTeamId: string, reason: string) {
  const { data } = await api.post<Match>("/championships/matches/" + matchId + "/forfeit", { winnerTeamId, reason });
  return data;
}

export async function fetchMatchDisputesRequest(matchId: string) {
  const { data } = await api.get<import("../types").MatchDispute[]>("/championships/matches/" + matchId + "/disputes");
  return data;
}

export async function openMatchDisputeRequest(matchId: string, reason: string) {
  const { data } = await api.post<import("../types").MatchDispute>("/championships/matches/" + matchId + "/disputes", { reason });
  return data;
}

export async function resolveMatchDisputeRequest(disputeId: string, status: "RESOLVED" | "REJECTED", resolutionNote?: string) {
  const { data } = await api.patch<import("../types").MatchDispute>("/championships/disputes/" + disputeId, { status, resolutionNote });
  return data;
}

export async function markMatchReadyRequest(matchId: string) {
  const { data } = await api.post<{ matchId: string; readyTeamIds: string[] }>(
    `/championships/matches/${matchId}/ready`
  );
  return data;
}

export async function updateMatchScoreRequest(
  matchId: string,
  input: { homeScore: number; awayScore: number; homePenalty?: number; awayPenalty?: number }
) {
  const { data } = await api.patch<Match>(`/championships/matches/${matchId}/score`, input);
  return data;
}

const EA_MATCH_TYPES = ["friendlyMatch", "leagueMatch", "playoffMatch"] as const;

async function fetchEaMatchPayloadsThroughBrowser(homeClubId: string, awayClubId: string): Promise<unknown[]> {
  const responses = await Promise.allSettled(
    EA_MATCH_TYPES.map(async (matchType) => {
      const targetUrl = new URL("https://proclubs.ea.com/api/fc/clubs/matches");
      targetUrl.searchParams.set("platform", "common-gen5");
      targetUrl.searchParams.set("clubIds", homeClubId);
      targetUrl.searchParams.set("matchType", matchType);
      targetUrl.searchParams.set("maxResultCount", "10");

      const readerUrl = `https://r.jina.ai/http://${targetUrl.host}${targetUrl.pathname}${targetUrl.search}`;
      const { data: envelope } = await axios.get<EaReaderEnvelope>(readerUrl, {
        headers: { Accept: "application/json" },
        timeout: 20_000,
      });
      if (typeof envelope.data?.content !== "string" || !envelope.data.content.trim()) {
        throw new Error("Resposta vazia da consulta de partidas da EA");
      }
      return JSON.parse(envelope.data.content) as unknown;
    })
  );

  const payloads = responses.flatMap((response) => response.status === "fulfilled" ? [response.value] : []);
  if (payloads.length === 0) {
    throw new Error("Não foi possível consultar as partidas da EA pelo navegador");
  }
  return payloads;
}

export async function fetchMatchScoreFromEaRequest(
  matchId: string,
  homeClubId?: string | null,
  awayClubId?: string | null
) {
  try {
    const { data } = await api.post<Match>(`/championships/matches/${matchId}/score/ea`);
    return data;
  } catch (error) {
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 502 ||
      !homeClubId ||
      !awayClubId
    ) {
      throw error;
    }
    const payloads = await fetchEaMatchPayloadsThroughBrowser(homeClubId, awayClubId);
    const { data } = await api.post<Match>(
      `/championships/matches/${matchId}/score/ea-client`,
      { payloads }
    );
    return data;
  }
}
export async function resetMatchScoreRequest(matchId: string) {
  const { data } = await api.post<Match>(`/championships/matches/${matchId}/reset`);
  return data;
}

export async function startMatchRequest(matchId: string) {
  const { data } = await api.post<Match>(`/championships/matches/${matchId}/start`);
  return data;
}
export async function fetchKnockoutBracket(championshipId: string) {
  const { data } = await api.get<Match[]>(`/championships/${championshipId}/knockout`);
  return data;
}

export async function fetchKnockoutReadiness(championshipId: string) {
  const { data } = await api.get<{ ready: boolean }>(
    `/championships/${championshipId}/knockout/ready`
  );
  return data;
}

export async function generateKnockoutRequest(championshipId: string) {
  const { data } = await api.post<Match[]>(`/championships/${championshipId}/knockout/generate`);
  return data;
}

export async function advanceKnockoutRequest(championshipId: string) {
  const { data } = await api.post<{ finished: boolean; championTeamId?: string }>(
    `/championships/${championshipId}/knockout/advance`
  );
  return data;
}

type EaReaderEnvelope = {
  data?: {
    content?: unknown;
  };
};

type EaReaderRecord = {
  clubId?: unknown;
  clubName?: unknown;
  wins?: unknown;
  losses?: unknown;
  ties?: unknown;
  draws?: unknown;
  clubInfo?: {
    clubId?: unknown;
    name?: unknown;
    regionId?: unknown;
  };
};
type EaReaderMember = {
  name?: unknown;
  playername?: unknown;
  playerName?: unknown;
  proName?: unknown;
  playerId?: unknown;
  playerID?: unknown;
  blazeId?: unknown;
  personaId?: unknown;
  proPos?: unknown;
  position?: unknown;
  favoritePosition?: unknown;
  pos?: unknown;
};

function toNullableString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function searchEaClubsThroughBrowser(name: string): Promise<EaClubSearchResult[]> {
  const targetUrl = new URL("https://proclubs.ea.com/api/fc/allTimeLeaderboard/search");
  targetUrl.searchParams.set("platform", "common-gen5");
  targetUrl.searchParams.set("clubName", name);
  targetUrl.searchParams.set("maxResultCount", "50");

  const readerUrl = `https://r.jina.ai/http://${targetUrl.host}${targetUrl.pathname}${targetUrl.search}`;
  const { data: envelope } = await axios.get<EaReaderEnvelope>(readerUrl, {
    headers: { Accept: "application/json" },
    timeout: 20_000,
  });
  if (typeof envelope.data?.content !== "string" || !envelope.data.content.trim()) {
    throw new Error("Resposta vazia da consulta alternativa da EA");
  }

  const payload = JSON.parse(envelope.data.content) as unknown;
  const records: EaReaderRecord[] = Array.isArray(payload)
    ? payload.filter((record): record is EaReaderRecord => typeof record === "object" && record !== null)
    : [];
  const unique = new Map<string, EaClubSearchResult>();

  for (const record of records) {
    const info = record.clubInfo || {};
    const clubId = toNullableString(info.clubId ?? record.clubId);
    const clubName = toNullableString(info.name ?? record.clubName);
    if (!clubId || !clubName || unique.has(clubId)) continue;

    unique.set(clubId, {
      clubId,
      name: clubName,
      regionId: toNullableString(info.regionId),
      wins: toNullableNumber(record.wins),
      draws: toNullableNumber(record.draws ?? record.ties),
      losses: toNullableNumber(record.losses),
    });
  }

  return [...unique.values()].slice(0, 50);
}

async function fetchEaPlayersThroughBrowser(clubId: string): Promise<Array<{ name: string; externalId?: string; position?: string }>> {
  const endpoints = ["members/career/stats", "members/stats"];
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const targetUrl = new URL(`https://proclubs.ea.com/api/fc/${endpoint}`);
      targetUrl.searchParams.set("platform", "common-gen5");
      targetUrl.searchParams.set("clubId", clubId);
      if (endpoint === "members/stats") targetUrl.searchParams.set("seasonId", "current");

      const readerUrl = `https://r.jina.ai/http://${targetUrl.host}${targetUrl.pathname}${targetUrl.search}`;
      const { data: envelope } = await axios.get<EaReaderEnvelope>(readerUrl, {
        headers: { Accept: "application/json" },
        timeout: 20_000,
      });
      if (typeof envelope.data?.content !== "string" || !envelope.data.content.trim()) {
        throw new Error("Resposta vazia da consulta de jogadores da EA");
      }

      const payload = JSON.parse(envelope.data.content) as unknown;
      const members =
        typeof payload === "object" && payload !== null && Array.isArray((payload as { members?: unknown }).members)
          ? (payload as { members: unknown[] }).members
          : [];
      const unique = new Map<string, { name: string; externalId?: string; position?: string }>();

      for (const value of members) {
        if (typeof value !== "object" || value === null) continue;
        const member = value as EaReaderMember;
        const name = toNullableString(member.name ?? member.playername ?? member.playerName ?? member.proName);
        if (!name) continue;
        const key = name.toLocaleLowerCase();
        if (unique.has(key)) continue;
        const externalId = toNullableString(member.playerId ?? member.playerID ?? member.blazeId ?? member.personaId);
        const position = toNullableString(member.proPos ?? member.position ?? member.favoritePosition ?? member.pos);
        unique.set(key, { name, ...(externalId ? { externalId } : {}), ...(position ? { position } : {}) });
      }

      return [...unique.values()];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Não foi possível consultar os jogadores da EA");
}
export async function searchEaClubsRequest(name: string) {
  try {
    const { data } = await api.get<EaClubSearchResult[]>("/championships/ea/clubs/search", {
      params: { name },
    });
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 502) throw error;
    return searchEaClubsThroughBrowser(name);
  }
}

export async function createOwnTeamRequest(input: { name: string; eaClubId: string }) {
  const { data } = await api.post<Team>("/championships/teams/self", input);
  return data;
}
export async function fetchMyTeamsRequest() {
  const { data } = await api.get<UserTeam[]>("/championships/teams/mine");
  return data;
}

export async function fetchMyApplicationsRequest() {
  const { data } = await api.get<ChampionshipApplication[]>("/championships/applications/mine");
  return data;
}

export async function requestChampionshipApplicationRequest(championshipId: string, teamId: string) {
  const { data } = await api.post<ChampionshipApplication>(
    `/championships/${championshipId}/applications`,
    { teamId }
  );
  return data;
}

export async function fetchChampionshipApplicationsRequest(championshipId: string) {
  const { data } = await api.get<ChampionshipApplication[]>(
    `/championships/${championshipId}/applications`
  );
  return data;
}

export async function reviewChampionshipApplicationRequest(
  applicationId: string,
  status: "APPROVED" | "REJECTED"
) {
  const { data } = await api.patch<ChampionshipApplication>(
    `/championships/applications/${applicationId}`,
    { status }
  );
  return data;
}
export async function updateOwnTeamRequest(teamId: string, input: { name: string; logoUrl?: string; eaClubId: string }) {
  const { data } = await api.patch<Team>("/championships/teams/" + teamId + "/self", input);
  return data;
}

export async function fetchTeamPlayersRequest(teamId: string) {
  const { data } = await api.get<Player[]>("/championships/teams/" + teamId + "/players");
  return data;
}

export async function syncTeamPlayersRequest(teamId: string, eaClubId?: string | null) {
  try {
    const { data } = await api.post<{ players: Player[]; added: number; updated: number; remoteCount: number }>(
      "/championships/teams/" + teamId + "/players/sync"
    );
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 502 || !eaClubId) throw error;
    const remotePlayers = await fetchEaPlayersThroughBrowser(eaClubId);
    const { data } = await api.post<{ players: Player[]; added: number; updated: number; remoteCount: number }>(
      "/championships/teams/" + teamId + "/players/sync-client",
      { players: remotePlayers }
    );
    return data;
  }
}

export async function createTeamPlayerRequest(teamId: string, input: { name: string; position?: string; externalId?: string }) {
  const { data } = await api.post<Player>("/championships/teams/" + teamId + "/players", input);
  return data;
}

export async function deleteTeamPlayerRequest(teamId: string, playerId: string) {
  await api.delete("/championships/teams/" + teamId + "/players/" + playerId);
}
export async function fetchChampionshipStatistics(championshipId: string) {
  const { data } = await api.get<ChampionshipStatistics>(`/championships/${championshipId}/statistics`);
  return data;
}

export async function updateMatchPlayerStatsRequest(matchId: string, stats: Array<{ playerId: string; goals: number; assists: number }>) {
  const { data } = await api.put<MatchPlayerStat[]>(`/championships/matches/${matchId}/player-stats`, { stats });
  return data;
}

export async function fetchMatchPlayerStatsFromEaRequest(
  matchId: string,
  homeClubId?: string | null,
  awayClubId?: string | null
) {
  try {
    const { data } = await api.post<MatchPlayerStat[]>(`/championships/matches/${matchId}/player-stats/ea`);
    return data;
  } catch (error) {
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 502 ||
      !homeClubId ||
      !awayClubId
    ) {
      throw error;
    }
    const payloads = await fetchEaMatchPayloadsThroughBrowser(homeClubId, awayClubId);
    const { data } = await api.post<MatchPlayerStat[]>(
      `/championships/matches/${matchId}/player-stats/ea-client`,
      { payloads }
    );
    return data;
  }
}
