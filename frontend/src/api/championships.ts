import { api } from "./client";
import { Championship, Group, GroupStandings, Match, Team, User } from "../types";

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
