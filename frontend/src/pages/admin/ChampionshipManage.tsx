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
}) {
  const hasPlayedMatches = matches.some((m) => m.status === "PLAYED");

  return (
    <div className="space-y-8">
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
          Gerar partidas dos grupos
        </button>
        <p className="text-xs text-slate-500">
          Sorteia {championship.numberOfGroups} grupo(s) com os times cadastrados e gera as partidas
          (turno unico). So e possivel gerar novamente enquanto nenhum resultado tiver sido lancado.
        </p>
      </div>

      {groups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="card p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-300">Grupo {group.name}</h4>
              <ul className="space-y-1 text-sm text-slate-400">
                {group.teams.map((gt) => (
                  <li key={gt.id}>{gt.team.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Partidas da fase de grupos</h3>
          <div className="space-y-2">
            {matches.map((match) => (
              <MatchScoreRow
                key={match.id}
                match={match}
                disabled={disabled}
                onSave={(home, away) => onSaveScore(match.id, home, away)}
                onReset={() => onResetScore(match.id)}
                onFetchScore={() => onFetchScore(match.id)}
              />
            ))}
          </div>
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
}) {
  const lastRound = matches.length > 0 ? matches[matches.length - 1].round : null;
  const currentRoundMatches = matches.filter((m) => m.round === lastRound);
  const currentRoundComplete =
    currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === "PLAYED");
  const isFinished = championship.stage === "FINISHED";

  return (
    <div className="space-y-8">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        {matches.length === 0 ? (
          <>
            <button className="btn-secondary" disabled={disabled || !ready} onClick={onGenerate}>
              Gerar mata-mata
            </button>
            <p className="text-xs text-slate-500">
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
              <p className="text-xs text-slate-500">
                {currentRoundComplete
                  ? "Todos os jogos da rodada atual foram concluidos."
                  : "Finalize todos os jogos da rodada atual para avancar."}
              </p>
            </>
          )
        )}
        {isFinished && championship.championTeam && (
          <p className="text-sm font-semibold text-accent-400">
            🏆 Campeao: {championship.championTeam.name}
          </p>
        )}
      </div>

      <BracketView matches={matches} />

      {matches.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Lancar resultados</h3>
          <div className="space-y-2">
            {matches
              .filter((m) => m.homeTeamId && m.awayTeamId)
              .map((match) => (
                <MatchScoreRow
                  key={match.id}
                  match={match}
                  disabled={disabled}
                  allowPenalty
                  onSave={(home, away, penHome, penAway) =>
                    onSaveScore(match.id, home, away, penHome, penAway)
                  }
                  onReset={() => onResetScore(match.id)}
                  onFetchScore={() => onFetchScore(match.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Linha de edicao de placar (compartilhada) ----------

function MatchScoreRow({
  match,
  disabled,
  allowPenalty,
  onSave,
  onReset,
  onFetchScore,
}: {
  match: Match;
  disabled: boolean;
  allowPenalty?: boolean;
  onSave: (home: number, away: number, penHome?: number, penAway?: number) => void;
  onReset: () => void;
  onFetchScore?: () => void;
}) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [penHome, setPenHome] = useState(match.homePenalty ?? 0);
  const [penAway, setPenAway] = useState(match.awayPenalty ?? 0);

  const needsPenalty = allowPenalty && home === away;

  function handleSave() {
    onSave(home, away, needsPenalty ? penHome : undefined, needsPenalty ? penAway : undefined);
  }

  return (
    <div className="card flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-slate-400">
        {match.round && <span>{match.round}</span>}
        {match.group && <span className="ml-1 text-slate-600">• Grupo {match.group.name}</span>}
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
        <span className="w-32 truncate text-right text-sm font-medium sm:w-40">
          {match.homeTeam?.name ?? "A definir"}
        </span>
        <input
          type="number"
          min={0}
          className="input w-16 text-center"
          value={home}
          onChange={(e) => setHome(Number(e.target.value))}
        />
        <span className="text-slate-500">x</span>
        <input
          type="number"
          min={0}
          className="input w-16 text-center"
          value={away}
          onChange={(e) => setAway(Number(e.target.value))}
        />
        <span className="w-32 truncate text-left text-sm font-medium sm:w-40">
          {match.awayTeam?.name ?? "A definir"}
        </span>
      </div>

      {needsPenalty && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Penaltis:</span>
          <input
            type="number"
            min={0}
            className="input w-14 text-center"
            value={penHome}
            onChange={(e) => setPenHome(Number(e.target.value))}
          />
          <span>x</span>
          <input
            type="number"
            min={0}
            className="input w-14 text-center"
            value={penAway}
            onChange={(e) => setPenAway(Number(e.target.value))}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onFetchScore && match.homeTeam?.eaClubId && match.awayTeam?.eaClubId && (
          <button
            className="btn-secondary !py-1.5 !px-3 text-xs"
            disabled={disabled}
            onClick={onFetchScore}
            title="Busca o resultado mais recente entre os dois EaClubIds na API da EA"
          >
            Buscar na EA
          </button>
        )}
        <button className="btn-primary !py-1.5 !px-3 text-xs" disabled={disabled} onClick={handleSave}>
          Salvar
        </button>
        {match.status === "PLAYED" && (
          <button
            className="btn-secondary !py-1.5 !px-3 text-xs"
            disabled={disabled}
            onClick={onReset}
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
