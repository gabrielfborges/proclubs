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

export async function updateMatchScoreRequest(
  matchId: string,
  input: { homeScore: number; awayScore: number; homePenalty?: number; awayPenalty?: number }
) {
  const { data } = await api.patch<Match>(`/championships/matches/${matchId}/score`, input);
  return data;
}

export async function fetchMatchScoreFromEaRequest(matchId: string) {
  const { data } = await api.post<Match>(`/championships/matches/${matchId}/score/ea`);
  return data;
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

export async function syncTeamPlayersRequest(teamId: string) {
  const { data } = await api.post<{ players: Player[]; added: number; updated: number; remoteCount: number }>(
    "/championships/teams/" + teamId + "/players/sync"
  );
  return data;
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

export async function fetchMatchPlayerStatsFromEaRequest(matchId: string) {
  const { data } = await api.post<MatchPlayerStat[]>(`/championships/matches/${matchId}/player-stats/ea`);
  return data;
}