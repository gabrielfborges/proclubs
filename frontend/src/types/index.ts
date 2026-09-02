export type ChampionshipStatus = "OPEN" | "IN_PROGRESS" | "FINISHED";
export type ChampionshipStage = "REGISTRATION" | "GROUP_STAGE" | "KNOCKOUT_STAGE" | "FINISHED";
export type UserRole = "ADMIN" | "USER";

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  eaClubId: string | null;
  captainUserId: string | null;
  captainUser?: Pick<User, "id" | "username"> | null;
  championshipId: string | null;
  createdAt: string;
  players?: Player[];
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  externalId: string | null;
  position: string | null;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Championship {
  id: string;
  name: string;
  description: string | null;
  maxTeams: number;
  numberOfGroups: number;
  teamsQualifyingPerGroup: number;
  stage: ChampionshipStage;
  status: ChampionshipStatus;
  championTeamId: string | null;
  championTeam?: Team | null;
  teams: Team[];
  groups?: Group[];
  createdAt: string;
}

export interface GroupTeamEntry {
  id: string;
  groupId: string;
  teamId: string;
  team: Team;
}

export interface Group {
  id: string;
  name: string;
  championshipId: string;
  teams: GroupTeamEntry[];
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  logoUrl: string | null;

  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStandings {
  groupId: string;
  groupName: string;
  standings: StandingRow[];
}

export type MatchPhase = "GROUP" | "KNOCKOUT";
export type MatchStatus = "SCHEDULED" | "PLAYED";

export interface MatchPlayerStat {
  id: string;
  matchId: string;
  playerId: string;
  player: Player;
  goals: number;
  assists: number;
  source: "EA" | "MANUAL";
}

export interface ChampionshipRankingRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals?: number;
  assists?: number;
}

export interface ChampionshipStatistics {
  scorers: ChampionshipRankingRow[];
  assisters: ChampionshipRankingRow[];
}

export interface Match {
  id: string;
  championshipId: string;
  phase: MatchPhase;
  groupId: string | null;
  group?: Group | null;
  round: string | null;
  roundOrder: number | null;
  homeTeamId: string | null;
  homeTeam: Team | null;
  awayTeamId: string | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalty: number | null;
  awayPenalty: number | null;
  winnerTeamId: string | null;
  winnerTeam?: Team | null;
  status: MatchStatus;
  discordChannelId: string | null;
  discordChannelUrl: string | null;
  startedAt: string | null;
  playerStats?: MatchPlayerStat[];
  readyTeamIds?: string[];
  myTeamId?: string | null;
}

export interface EaClubSearchResult {
  clubId: string;
  name: string;
  regionId: string | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
}

export type ChampionshipApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ChampionshipApplication {
  id: string;
  teamId: string;
  championshipId: string;
  status: ChampionshipApplicationStatus;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  team: Team;
  championship?: Pick<Championship, "id" | "name" | "stage">;
}

export interface UserTeam extends Team {
  championship?: Pick<Championship, "id" | "name" | "stage"> | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  discordId: string | null;
  role: UserRole;
}
