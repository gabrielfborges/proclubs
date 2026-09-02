import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchChampionship,
  fetchStandings,
  fetchMatches,
  fetchKnockoutBracket,
  fetchChampionshipStatistics,
  fetchMyApplicationsRequest,
  fetchMyTeamsRequest,
  requestChampionshipApplicationRequest,
} from "../../api/championships";
import { Championship, ChampionshipApplication, GroupStandings, Match, UserTeam, ChampionshipStatistics } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { StandingsTable } from "../../components/StandingsTable";
import { MatchList } from "../../components/MatchList";
import { BracketView } from "../../components/BracketView";
import { getApiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ChampionshipStatisticsPanel } from "../../components/ChampionshipStatisticsPanel";

type TabKey = "standings" | "matches" | "knockout" | "teams" | "stats";

export function ChampionshipDetail() {
  const { id } = useParams<{ id: string }>();
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [statistics, setStatistics] = useState<ChampionshipStatistics>({ scorers: [], assisters: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("standings");
  const { isAuthenticated } = useAuth();
  const [showRegistration, setShowRegistration] = useState(false);
  const [myTeams, setMyTeams] = useState<UserTeam[]>([]);
  const [myApplications, setMyApplications] = useState<ChampionshipApplication[]>([]);
  const [registrationTeamId, setRegistrationTeamId] = useState("");
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchChampionship(id),
      fetchStandings(id),
      fetchMatches(id, "GROUP"),
      fetchKnockoutBracket(id),
      fetchChampionshipStatistics(id),
    ])
      .then(([champ, st, matches, knockout, stats]) => {
        setChampionship(champ);
        setStandings(st);
        setGroupMatches(matches);
        setKnockoutMatches(knockout);
        setStatistics(stats);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!showRegistration || !isAuthenticated || championship?.stage !== "REGISTRATION") return;

    setRegistrationLoading(true);
    setRegistrationError("");
    Promise.all([fetchMyTeamsRequest(), fetchMyApplicationsRequest()])
      .then(([teams, applications]) => {
        setMyTeams(teams);
        setMyApplications(applications);
        setRegistrationTeamId(teams.find((team) => !team.championshipId)?.id || "");
      })
      .catch((err) => setRegistrationError(getApiErrorMessage(err)))
      .finally(() => setRegistrationLoading(false));
  }, [showRegistration, isAuthenticated, championship?.stage]);

  async function handleRegistrationSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id || !registrationTeamId) return;

    setRegistrationSubmitting(true);
    setRegistrationError("");
    setRegistrationSuccess("");
    try {
      const application = await requestChampionshipApplicationRequest(id, registrationTeamId);
      setMyApplications((current) => [application, ...current.filter((item) => item.id !== application.id)]);
      setRegistrationSuccess("Solicitação enviada. Aguarde a análise do administrador.");
    } catch (err) {
      setRegistrationError(getApiErrorMessage(err));
    } finally {
      setRegistrationSubmitting(false);
    }
  }

  if (loading) return <Loading label="Carregando campeonato..." />;
  if (error) return <div className="mx-auto max-w-6xl px-4 py-8"><ErrorBox message={error} /></div>;
  if (!championship) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "standings", label: "Classificacao" },
    { key: "matches", label: "Partidas" },
    { key: "knockout", label: "Mata-mata" },
    { key: "teams", label: "Times" },
    { key: "stats", label: "Artilharia" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-slate-400 hover:text-accent-400">
        ← Voltar para campeonatos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold">{championship.name}</h1>
            <StatusBadge status={championship.status} />
          </div>
          {championship.description && (
            <p className="max-w-2xl text-sm text-slate-400">{championship.description}</p>
          )}
        </div>
        {championship.championTeam && (
          <div className="card px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-400">Campeao</p>
            <p className="text-lg font-bold text-accent-400">🏆 {championship.championTeam.name}</p>
          </div>
        )}
      </div>

      {championship.stage === "REGISTRATION" && (
        <section className="card mb-6 border-accent-500/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Vagas abertas</p>
              <h2 className="mt-1 font-semibold">Quer participar deste campeonato?</h2>
              <p className="mt-1 text-sm text-slate-400">Solicite sua inscrição usando um time criado por você.</p>
            </div>
            {isAuthenticated ? (
              <button type="button" className="btn-primary" onClick={() => { setShowRegistration((current) => !current); setRegistrationError(""); setRegistrationSuccess(""); }}>
                {showRegistration ? "Fechar" : "Solicitar inscrição"}
              </button>
            ) : (
              <Link to="/login" state={{ from: `/campeonatos/${id}` }} className="btn-primary">Entrar para solicitar</Link>
            )}
          </div>

          {showRegistration && isAuthenticated && (
            <div className="mt-4 border-t border-base-700 pt-4">
              {registrationLoading ? (
                <p className="text-sm text-slate-400">Carregando seus times...</p>
              ) : (
                <form onSubmit={handleRegistrationSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="label">Selecione seu time</label>
                    <select className="input" value={registrationTeamId} onChange={(event) => setRegistrationTeamId(event.target.value)} disabled={myTeams.filter((team) => !team.championshipId).length === 0}>
                      <option value="">Selecione um time independente</option>
                      {myTeams.filter((team) => !team.championshipId).map((team) => (
                        <option key={team.id} value={team.id}>{team.name} · EA {team.eaClubId || "sem ID"}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary sm:shrink-0" disabled={registrationSubmitting || !registrationTeamId || myApplications.some((application) => application.teamId === registrationTeamId && application.championshipId === id && application.status === "PENDING")}>
                    {registrationSubmitting ? "Enviando..." : "Enviar solicitação"}
                  </button>
                </form>
              )}

              {!registrationLoading && myTeams.filter((team) => !team.championshipId).length === 0 && (
                <p className="mt-3 text-sm text-slate-400">Você ainda não possui um time independente. <Link to="/times/criar" className="text-accent-400 hover:text-accent-300">Crie seu time primeiro →</Link></p>
              )}
              {registrationError && <p className="mt-3 text-sm text-red-300">{registrationError}</p>}
              {registrationSuccess && <p className="mt-3 text-sm text-emerald-300">{registrationSuccess}</p>}
              {registrationTeamId && myApplications.find((application) => application.teamId === registrationTeamId && application.championshipId === id) && (
                <p className="mt-3 text-xs text-slate-500">Este time já possui uma solicitação para este campeonato.</p>
              )}
            </div>
          )}
        </section>
      )}

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

      {tab === "stats" && <ChampionshipStatisticsPanel statistics={statistics} />}

      {tab === "standings" && (
        <div className="space-y-8">
          {standings.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Os grupos ainda nao foram gerados para este campeonato.
            </p>
          )}
          {standings.map((group) => (
            <div key={group.groupId}>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Grupo {group.groupName}</h3>
              <StandingsTable rows={group.standings} highlightTop={championship.teamsQualifyingPerGroup} />
            </div>
          ))}
        </div>
      )}

      {tab === "matches" && <MatchList matches={groupMatches} />}

      {tab === "knockout" && <BracketView matches={knockoutMatches} />}

      {tab === "teams" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {championship.teams.map((team) => (
            <div key={team.id} className="card flex items-center gap-3 p-3">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-800 text-sm font-bold text-slate-400">
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="font-medium">{team.name}</span>
            </div>
          ))}
          {championship.teams.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-500">
              Nenhum time cadastrado ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
