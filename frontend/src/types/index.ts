export type ChampionshipStatus = "OPEN" | "IN_PROGRESS" | "FINISHED";
export type ChampionshipStage = "REGISTRATION" | "GROUP_STAGE" | "KNOCKOUT_STAGE" | "FINISHED";

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  championshipId: string;
  createdAt: string;
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
}

export interface Admin {
  id: string;
  username: string;
}
