import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchChampionship,
  fetchTeams,
  fetchUsersRequest,
  createTeamRequest,
  deleteTeamRequest,
  fetchGroups,
  generateGroupsRequest,
  generateMatchesRequest,
  fetchMatches,
  updateMatchScoreRequest,
  fetchMatchScoreFromEaRequest,
  resetMatchScoreRequest,
  startMatchRequest,
  fetchKnockoutBracket,
  fetchKnockoutReadiness,
  generateKnockoutRequest,
  advanceKnockoutRequest,
} from "../../api/championships";
import { Championship, Group, Match, Team, User } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { BracketView } from "../../components/BracketView";
import { getApiErrorMessage } from "../../api/client";

type TabKey = "teams" | "groups" | "knockout";

export function ChampionshipManage() {
  const { id } = useParams<{ id: string }>();
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [knockoutReady, setKnockoutReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("teams");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [champ, teamList, userList, groupList, matches, knockout, readiness] = await Promise.all([
        fetchChampionship(id),
        fetchTeams(id),
        fetchUsersRequest(),
        fetchGroups(id),
        fetchMatches(id, "GROUP"),
        fetchKnockoutBracket(id),
        fetchKnockoutReadiness(id),
      ]);
      setChampionship(champ);
      setTeams(teamList);
      setUsers(userList);
      setGroups(groupList);
      setGroupMatches(matches);
      setKnockoutMatches(knockout);
      setKnockoutReady(readiness.ready);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function runAction(fn: () => Promise<any>) {
    setActionError("");
    setActionLoading(true);
    try {
      await fn();
      await loadAll();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Loading label="Carregando campeonato..." />;
  if (error) return <div className="mx-auto max-w-6xl px-4 py-8"><ErrorBox message={error} /></div>;
  if (!championship || !id) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "teams", label: "Times" },
    { key: "groups", label: "Grupos & Partidas" },
    { key: "knockout", label: "Mata-mata" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin" className="mb-4 inline-block text-sm text-slate-400 hover:text-accent-400">
        ← Voltar ao painel
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{championship.name}</h1>
          <StatusBadge status={championship.status} />
        </div>
        <span className="text-sm text-slate-400">
          {teams.length}/{championship.maxTeams} times cadastrados
        </span>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-base-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-accent-500 text-accent-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}

      {tab === "teams" && (
        <TeamsPanel
          championship={championship}
          teams={teams}
          users={users}
          disabled={actionLoading}
          onAdd={(name, logoUrl, eaClubId, captainUserId) =>
            runAction(() => createTeamRequest(id, { name, logoUrl: logoUrl || undefined, eaClubId, captainUserId }))
          }
          onRemove={(teamId) => runAction(() => deleteTeamRequest(teamId))}
        />
      )}

      {tab === "groups" && (
        <GroupsPanel
          championship={championship}
          groups={groups}
          matches={groupMatches}
          disabled={actionLoading}
          onGenerateGroups={() => runAction(() => generateGroupsRequest(id))}
          onGenerateMatches={() => runAction(() => generateMatchesRequest(id))}
          onSaveScore={(matchId, homeScore, awayScore) =>
            runAction(() => updateMatchScoreRequest(matchId, { homeScore, awayScore }))
          }
          onFetchScore={(matchId) => runAction(() => fetchMatchScoreFromEaRequest(matchId))}
          onResetScore={(matchId) => runAction(() => resetMatchScoreRequest(matchId))}
          onStartChat={(matchId) => runAction(() => startMatchRequest(matchId))}
        />
      )}

      {tab === "knockout" && (
        <KnockoutPanel
          championship={championship}
          matches={knockoutMatches}
          ready={knockoutReady}
          disabled={actionLoading}
          onGenerate={() => runAction(() => generateKnockoutRequest(id))}
          onAdvance={() => runAction(() => advanceKnockoutRequest(id))}
          onSaveScore={(matchId, homeScore, awayScore, homePenalty, awayPenalty) =>
            runAction(() =>
              updateMatchScoreRequest(matchId, { homeScore, awayScore, homePenalty, awayPenalty })
            )
          }
          onFetchScore={(matchId) => runAction(() => fetchMatchScoreFromEaRequest(matchId))}
          onResetScore={(matchId) => runAction(() => resetMatchScoreRequest(matchId))}
          onStartChat={(matchId) => runAction(() => startMatchRequest(matchId))}
        />
      )}
    </div>
  );
}

// ---------- Times ----------

function TeamsPanel({
  championship,
  teams,
  users,
  disabled,
  onAdd,
  onRemove,
}: {
  championship: Championship;
  teams: Team[];
  users: User[];
  disabled: boolean;
  onAdd: (name: string, logoUrl: string, eaClubId: string, captainUserId: string) => void;
  onRemove: (teamId: string) => void;
}) {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [eaClubId, setEaClubId] = useState("");
  const [captainUserId, setCaptainUserId] = useState("");
  const canAdd = championship.stage === "REGISTRATION" && teams.length < championship.maxTeams;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !eaClubId.trim() || !captainUserId.trim()) return;
    onAdd(name.trim(), logoUrl.trim(), eaClubId.trim(), captainUserId.trim());
    setName("");
    setLogoUrl("");
    setEaClubId("");
    setCaptainUserId("");
  }

  return (
    <div className="space-y-6">
      {championship.stage !== "REGISTRATION" && (
        <ErrorBox message="Este campeonato ja iniciou. Nao e mais possivel adicionar ou remover times." />
      )}

      {canAdd && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <label className="label">Nome do time</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">EaClubId</label>
            <input
              className="input"
              value={eaClubId}
              onChange={(e) => setEaClubId(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label className="label">Capitao</label>
            <select className="input" value={captainUserId} onChange={(e) => setCaptainUserId(e.target.value)} required>
              <option value="">Selecione um usuario</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">URL do escudo (opcional)</label>
            <input className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-1" disabled={disabled}>
            Adicionar time
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div key={team.id} className="card flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-base-800 text-xs font-bold text-slate-400">
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="block font-medium">{team.name}</span>
                <span className="block text-xs text-slate-500">
                  Capitao: {team.captainUser?.username || "nao informado"} • EA: {team.eaClubId || "nao informado"}
                </span>
              </div>
            </div>
            {championship.stage === "REGISTRATION" && (
              <button
                className="text-xs text-red-400 hover:text-red-300"
                disabled={disabled}
                onClick={() => onRemove(team.id)}
              >
                remover
              </button>
            )}
          </div>
        ))}
        {teams.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-slate-500">
            Nenhum time cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- Grupos & Partidas ----------

function GroupsPanel({
  championship,
  groups,
  matches,
  disabled,
  onGenerateGroups,
  onGenerateMatches,
  onSaveScore,
  onResetScore,
  onFetchScore,
  onStartChat,
}: {
  championship: Championship;
  groups: Group[];
  matches: Match[];
  disabled: boolean;
  onGenerateGroups: () => void;
  onGenerateMatches: () => void;
  onSaveScore: (matchId: string, home: number, away: number) => void;
  onResetScore: (matchId: string) => void;
  onFetchScore: (matchId: string) => void;
  onStartChat: (matchId: string) => void;
}) {
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PLAYED">("ALL");
  const hasPlayedMatches = matches.some((m) => m.status === "PLAYED");
  const playedCount = matches.filter((m) => m.status === "PLAYED").length;
  const pendingCount = matches.length - playedCount;
  const filteredMatches = matches.filter((match) => {
    const matchesGroup = groupFilter === "ALL" || match.groupId === groupFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PLAYED" && match.status === "PLAYED") ||
      (statusFilter === "PENDING" && match.status !== "PLAYED");
    return matchesGroup && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Fase de grupos</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Lancar resultados</h2>
            <p className="mt-1 text-sm text-slate-400">
              Preencha o placar final de cada partida. Jogos pendentes aparecem com os campos vazios.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ProgressStat label="Total" value={matches.length} />
            <ProgressStat label="Lancados" value={playedCount} accent />
            <ProgressStat label="Pendentes" value={pendingCount} warning />
          </div>
        </div>
        {matches.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Progresso dos resultados</span>
              <span>{playedCount} de {matches.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-base-800">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: matches.length ? ((playedCount / matches.length) * 100) + "%" : "0%" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <button
          className="btn-secondary"
          disabled={disabled || championship.stage !== "REGISTRATION" || hasPlayedMatches}
          onClick={onGenerateGroups}
        >
          Sortear grupos
        </button>
        <button
          className="btn-secondary"
          disabled={disabled || groups.length === 0 || hasPlayedMatches}
          onClick={onGenerateMatches}
        >
          Gerar partidas
        </button>
        <p className="min-w-[220px] flex-1 text-xs text-slate-500">
          Gere ou refaca a tabela enquanto nenhum resultado tiver sido lancado.
        </p>
      </div>

      {groups.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-300">Grupos</h3>
            <span className="text-xs text-slate-500">Clique em um grupo para filtrar</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const groupMatches = matches.filter((match) => match.groupId === group.id);
              const groupPlayed = groupMatches.filter((match) => match.status === "PLAYED").length;
              const selected = groupFilter === group.id;
              return (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => setGroupFilter(selected ? "ALL" : group.id)}
                  className={
                    "card p-4 text-left transition-colors hover:border-accent-500 " +
                    (selected ? "border-accent-500 ring-1 ring-accent-500/40" : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">Grupo {group.name}</h4>
                    <span className="text-xs text-accent-400">{groupPlayed}/{groupMatches.length}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-slate-400">
                    {group.teams.map((gt) => (
                      <li key={gt.id} className="truncate">{gt.team.name}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-300">Partidas</h3>
              <p className="text-xs text-slate-500">
                Exibindo {filteredMatches.length} de {matches.length} partida(s)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="input w-auto min-w-[145px]"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                aria-label="Filtrar por grupo"
              >
                <option value="ALL">Todos os grupos</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>Grupo {group.name}</option>
                ))}
              </select>
              <select
                className="input w-auto min-w-[135px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "PLAYED")}
                aria-label="Filtrar por status"
              >
                <option value="ALL">Todos os status</option>
                <option value="PENDING">Pendentes</option>
                <option value="PLAYED">Lancados</option>
              </select>
            </div>
          </div>

          {filteredMatches.length > 0 ? (
            <div className="space-y-3">
              {filteredMatches.map((match, index) => (
                <MatchScoreRow
                  key={match.id}
                  match={match}
                  matchNumber={index + 1}
                  disabled={disabled}
                  onSave={(home, away) => onSaveScore(match.id, home, away)}
                  onReset={() => onResetScore(match.id)}
                  onFetchScore={() => onFetchScore(match.id)}
                    onStartChat={() => onStartChat(match.id)}
                />
              ))}
            </div>
          ) : (
            <div className="card px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma partida corresponde aos filtros selecionados.
            </div>
          )}
        </div>
      )}

      {matches.length === 0 && (
        <div className="card px-4 py-10 text-center">
          <p className="font-medium text-slate-300">As partidas ainda nao foram geradas.</p>
          <p className="mt-1 text-sm text-slate-500">Gere os grupos e depois crie a tabela de partidas para lancar os resultados.</p>
        </div>
      )}
    </div>
  );
}

// ---------- Mata-mata ----------

function KnockoutPanel({
  championship,
  matches,
  ready,
  disabled,
  onGenerate,
  onAdvance,
  onSaveScore,
  onResetScore,
  onFetchScore,
  onStartChat,
}: {
  championship: Championship;
  matches: Match[];
  ready: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onAdvance: () => void;
  onSaveScore: (
    matchId: string,
    home: number,
    away: number,
    homePenalty?: number,
    awayPenalty?: number
  ) => void;
  onResetScore: (matchId: string) => void;
  onFetchScore: (matchId: string) => void;
  onStartChat: (matchId: string) => void;
}) {
  const [roundFilter, setRoundFilter] = useState("CURRENT");
  const lastRound = matches.length > 0 ? matches[matches.length - 1].round : null;
  const roundNames = Array.from(
    new Set(matches.map((match) => match.round).filter((round): round is string => Boolean(round)))
  );
  const selectedRound = roundFilter === "ALL" ? null : roundFilter === "CURRENT" ? lastRound : roundFilter;
  const visibleMatches = matches.filter((match) => !selectedRound || match.round === selectedRound);
  const currentRoundMatches = matches.filter((match) => match.round === lastRound);
  const currentRoundComplete =
    currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === "PLAYED");
  const playedCount = matches.filter((match) => match.status === "PLAYED").length;
  const pendingCount = matches.length - playedCount;
  const isFinished = championship.stage === "FINISHED";

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Mata-mata</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Resultados por rodada</h2>
            <p className="mt-1 text-sm text-slate-400">
              Lance os jogos da rodada atual. A proxima fase sera liberada quando todos estiverem concluidos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ProgressStat label="Total" value={matches.length} />
            <ProgressStat label="Lancados" value={playedCount} accent />
            <ProgressStat label="Pendentes" value={pendingCount} warning />
          </div>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        {matches.length === 0 ? (
          <>
            <button className="btn-secondary" disabled={disabled || !ready} onClick={onGenerate}>
              Gerar mata-mata
            </button>
            <p className="min-w-[240px] flex-1 text-xs text-slate-500">
              {ready
                ? "Todos os jogos da fase de grupos possuem resultado. Voce ja pode gerar o mata-mata."
                : "Ainda ha partidas da fase de grupos sem resultado."}
            </p>
          </>
        ) : (
          !isFinished && (
            <>
              <button
                className="btn-secondary"
                disabled={disabled || !currentRoundComplete}
                onClick={onAdvance}
              >
                Avancar para a proxima fase
              </button>
              <p className="min-w-[240px] flex-1 text-xs text-slate-500">
                {currentRoundComplete
                  ? "Todos os jogos da rodada atual foram concluidos."
                  : "Finalize todos os jogos da rodada atual para avancar."}
              </p>
            </>
          )
        )}
        {isFinished && championship.championTeam && (
          <p className="text-sm font-semibold text-accent-400">
            Campeao: {championship.championTeam.name}
          </p>
        )}
      </div>

      <BracketView matches={matches} />

      {matches.length > 0 && (
        <div>
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-300">Lancar resultados</h3>
              <p className="text-xs text-slate-500">
                {visibleMatches.filter((match) => match.status === "PLAYED").length} de {visibleMatches.length} lancada(s) nesta visualizacao
              </p>
            </div>
            <select
              className="input w-auto min-w-[190px]"
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              aria-label="Selecionar rodada"
            >
              <option value="CURRENT">Rodada atual ({lastRound || "nenhuma"})</option>
              <option value="ALL">Todas as rodadas</option>
              {roundNames.map((round) => (
                <option key={round} value={round}>{round}</option>
              ))}
            </select>
          </div>

          {visibleMatches.length > 0 ? (
            <div className="space-y-3">
              {visibleMatches
                .filter((match) => match.homeTeamId && match.awayTeamId)
                .map((match, index) => (
                  <MatchScoreRow
                    key={match.id}
                    match={match}
                    matchNumber={index + 1}
                    disabled={disabled}
                    allowPenalty
                    onSave={(home, away, penHome, penAway) =>
                      onSaveScore(match.id, home, away, penHome, penAway)
                    }
                    onReset={() => onResetScore(match.id)}
                    onFetchScore={() => onFetchScore(match.id)}
                    onStartChat={() => onStartChat(match.id)}
                  />
                ))}
            </div>
          ) : (
            <div className="card px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma partida disponivel nesta rodada.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressStat({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-base-700 bg-base-800/70 px-3 py-2 text-center">
      <span className="block text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={
        "mt-0.5 block text-lg font-bold " +
        (accent ? "text-accent-400" : warning ? "text-amber-400" : "text-slate-200")
      }>
        {value}
      </span>
    </div>
  );
}

// ---------- Linha de edicao de placar (compartilhada) ----------

function MatchScoreRow({
  match,
  matchNumber,
  disabled,
  allowPenalty,
  onSave,
  onReset,
  onFetchScore,
  onStartChat,
}: {
  match: Match;
  matchNumber: number;
  disabled: boolean;
  allowPenalty?: boolean;
  onSave: (home: number, away: number, penHome?: number, penAway?: number) => void;
  onReset: () => void;
  onFetchScore?: () => void;
  onStartChat?: () => void;
}) {
  const [home, setHome] = useState(match.homeScore == null ? "" : String(match.homeScore));
  const [away, setAway] = useState(match.awayScore == null ? "" : String(match.awayScore));
  const [penHome, setPenHome] = useState(match.homePenalty == null ? "" : String(match.homePenalty));
  const [penAway, setPenAway] = useState(match.awayPenalty == null ? "" : String(match.awayPenalty));
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setHome(match.homeScore == null ? "" : String(match.homeScore));
    setAway(match.awayScore == null ? "" : String(match.awayScore));
    setPenHome(match.homePenalty == null ? "" : String(match.homePenalty));
    setPenAway(match.awayPenalty == null ? "" : String(match.awayPenalty));
  }, [match.id, match.homeScore, match.awayScore, match.homePenalty, match.awayPenalty]);

  const homeScore = home === "" ? null : Number(home);
  const awayScore = away === "" ? null : Number(away);
  const needsPenalty =
    allowPenalty &&
    homeScore !== null &&
    awayScore !== null &&
    homeScore === awayScore;

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (homeScore === null || awayScore === null) {
      setValidationError("Informe os dois placares antes de salvar.");
      return;
    }
    if (needsPenalty && (penHome === "" || penAway === "")) {
      setValidationError("Informe os dois placares dos penaltis.");
      return;
    }
    setValidationError("");
    onSave(
      homeScore,
      awayScore,
      needsPenalty && penHome !== "" ? Number(penHome) : undefined,
      needsPenalty && penAway !== "" ? Number(penAway) : undefined
    );
  }

  function handleScoreChange(value: string, setter: (value: string) => void) {
    setter(value.replace(/[^0-9]/g, ""));
    setValidationError("");
  }

  return (
    <form onSubmit={handleSave} className="card p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-[170px] items-center justify-between gap-3 xl:w-[210px]">
          <div>
            <p className="text-xs font-semibold text-slate-300">
              Jogo {matchNumber}{match.round ? " · " + match.round : ""}
            </p>
            {match.group && <p className="mt-1 text-xs text-slate-500">Grupo {match.group.name}</p>}
            <p className="mt-1 max-w-[210px] truncate text-[11px] text-slate-400" title={`${match.homeTeam?.name ?? "A definir"} x ${match.awayTeam?.name ?? "A definir"}`}>
              {match.homeTeam?.name ?? "A definir"} x {match.awayTeam?.name ?? "A definir"}
            </p>
          </div>
          <span
            className={
              "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide " +
              (match.status === "PLAYED"
                ? "bg-accent-500/15 text-accent-400"
                : "bg-amber-500/15 text-amber-400")
            }
          >
            {match.status === "PLAYED" ? "Lancado" : "Pendente"}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
          <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-slate-200">
            {match.homeTeam?.name ?? "A definir"}
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={"Gols de " + (match.homeTeam?.name ?? "time da casa")}
            className="input h-12 w-16 text-center text-lg font-bold"
            placeholder="0"
            value={home}
            onChange={(e) => handleScoreChange(e.target.value, setHome)}
          />
          <span className="text-sm font-semibold text-slate-500">x</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={"Gols de " + (match.awayTeam?.name ?? "time visitante")}
            className="input h-12 w-16 text-center text-lg font-bold"
            placeholder="0"
            value={away}
            onChange={(e) => handleScoreChange(e.target.value, setAway)}
          />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-200">
            {match.awayTeam?.name ?? "A definir"}
          </span>
        </div>

        {needsPenalty && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-slate-400">
            <span className="whitespace-nowrap text-amber-300">Penaltis</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Penaltis do time da casa"
              className="input h-9 w-14 text-center"
              placeholder="0"
              value={penHome}
              onChange={(e) => handleScoreChange(e.target.value, setPenHome)}
            />
            <span>x</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Penaltis do time visitante"
              className="input h-9 w-14 text-center"
              placeholder="0"
              value={penAway}
              onChange={(e) => handleScoreChange(e.target.value, setPenAway)}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 xl:min-w-[315px]">
          {match.discordChannelUrl ? (
            <a
              href={match.discordChannelUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary !py-2 !px-3 text-xs"
            >
              Abrir chat no Discord
            </a>
          ) : onStartChat && match.homeTeam?.captainUser && match.awayTeam?.captainUser ? (
            <button
              type="button"
              className="btn-primary !py-2 !px-3 text-xs"
              disabled={disabled}
              onClick={onStartChat}
              title="Cria um canal privado no Discord para os dois capitães"
            >
              Começar partida
            </button>
          ) : null}
          {onFetchScore && match.homeTeam?.eaClubId && match.awayTeam?.eaClubId && (
            <button
              type="button"
              className="btn-secondary !py-2 !px-3 text-xs"
              disabled={disabled}
              onClick={onFetchScore}
              title="Busca automaticamente o resultado mais recente entre os dois EaClubIds"
            >
              Buscar na EA
            </button>
          )}
          <button type="submit" className="btn-primary !py-2 !px-4 text-xs" disabled={disabled}>
            Salvar resultado
          </button>
          {match.status === "PLAYED" && (
            <button
              type="button"
              className="btn-secondary !py-2 !px-3 text-xs"
              disabled={disabled}
              onClick={onReset}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {validationError && (
        <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {validationError}
        </p>
      )}
    </form>
  );
}