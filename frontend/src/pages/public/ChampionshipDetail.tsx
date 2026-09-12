import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchChampionship,
  fetchStandings,
  fetchMatches,
  fetchKnockoutBracket,
  fetchChampionshipStatistics,
  fetchMyChampionshipMatchesRequest,
  markMatchReadyRequest,
  openMatchDisputeRequest,
  fetchMyApplicationsRequest,
  fetchMyTeamsRequest,
  requestChampionshipApplicationRequest,
  fetchApplicationPaymentRequest,
  createApplicationPaymentRequest,
} from "../../api/championships";
import { ApplicationPayment, Championship, ChampionshipApplication, GroupStandings, Match, UserTeam, ChampionshipStatistics } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { StandingsTable } from "../../components/StandingsTable";
import { MatchList } from "../../components/MatchList";
import { BracketView } from "../../components/BracketView";
import { getApiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ChampionshipStatisticsPanel } from "../../components/ChampionshipStatisticsPanel";
import { MatchChat } from "../../components/MatchChat";
import { calculatePrizeForTeams, formatPrize } from "../../utils/prizes";

type TabKey = "standings" | "matches" | "knockout" | "teams" | "stats";

function formatChampionshipDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" }) : "Data e horário a definir";
}
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
  const [applicationPayment, setApplicationPayment] = useState<ApplicationPayment | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [myMatchesLoading, setMyMatchesLoading] = useState(false);
  const [readyMatchId, setReadyMatchId] = useState("");
  const [readyError, setReadyError] = useState("");
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>({
    standings: false,
    matches: false,
    knockout: false,
    teams: true,
    stats: false,
  });
  const selectedApplication = myApplications.find(
    (application) => application.teamId === registrationTeamId && application.championshipId === id
  );

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setChampionship(null);
    setStandings([]);
    setGroupMatches([]);
    setKnockoutMatches([]);
    setStatistics({ scorers: [], assisters: [] });
    setTabError("");
    setLoadedTabs({ standings: false, matches: false, knockout: false, teams: true, stats: false });

    fetchChampionship(id)
      .then((champ) => {
        if (!cancelled) setChampionship(champ);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !championship || championship.id !== id || tab === "teams" || loadedTabs[tab]) return;

    const championshipId = id;
    let cancelled = false;
    setTabLoading(true);
    setTabError("");

    async function loadTab() {
      switch (tab) {
        case "standings": {
          const data = await fetchStandings(championshipId);
          if (!cancelled) setStandings(data);
          break;
        }
        case "matches": {
          const data = await fetchMatches(championshipId, "GROUP");
          if (!cancelled) setGroupMatches(data);
          break;
        }
        case "knockout": {
          const data = await fetchKnockoutBracket(championshipId);
          if (!cancelled) setKnockoutMatches(data);
          break;
        }
        case "stats": {
          const data = await fetchChampionshipStatistics(championshipId);
          if (!cancelled) setStatistics(data);
          break;
        }
      }
    }

    loadTab()
      .then(() => {
        if (!cancelled) setLoadedTabs((current) => ({ ...current, [tab]: true }));
      })
      .catch((err) => {
        if (!cancelled) setTabError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setTabLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, championship, tab, loadedTabs[tab]]);

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

  useEffect(() => {
    if (!selectedApplication) {
      setApplicationPayment(null);
      setPaymentError("");
      return;
    }

    const application = selectedApplication;
    const registrationFeeCents = championship?.registrationFeeCents || 0;
    let cancelled = false;
    const shouldPoll = registrationFeeCents > 0 && application.status === "PENDING";

    async function refreshApplicationStatus(initial: boolean) {
      if (initial) setPaymentLoading(true);
      try {
        const [payment, applications] = await Promise.all([
          fetchApplicationPaymentRequest(application.id),
          fetchMyApplicationsRequest(),
        ]);
        if (cancelled) return;

        setApplicationPayment(payment);
        const updatedApplication = applications.find((item) => item.id === application.id);
        if (updatedApplication) {
          setMyApplications(applications);
          if (application.status === "PENDING" && updatedApplication.status === "APPROVED") {
            setRegistrationSuccess("Inscricao aprovada automaticamente apos a confirmacao do pagamento.");
          } else if (updatedApplication.status === "APPROVED" && payment?.status === "APPROVED") {
            setRegistrationSuccess("Inscricao aprovada apos a confirmacao do pagamento.");
          }
        }
      } catch (err) {
        if (!cancelled) setPaymentError(getApiErrorMessage(err));
      } finally {
        if (!cancelled && initial) setPaymentLoading(false);
      }
    }

    setPaymentError("");
    void refreshApplicationStatus(true);
    const intervalId = shouldPoll
      ? window.setInterval(() => void refreshApplicationStatus(false), 5000)
      : undefined;

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [championship?.registrationFeeCents, selectedApplication?.id, selectedApplication?.status]);

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setMyMatches([]);
      return;
    }

    const championshipId = id;
    let cancelled = false;
    let initialLoad = true;
    async function loadMyMatches() {
      if (initialLoad) setMyMatchesLoading(true);
      try {
        const matches = await fetchMyChampionshipMatchesRequest(championshipId);
        if (!cancelled) {
          setMyMatches(matches);
          setReadyError("");
        }
      } catch (err) {
        if (!cancelled) setReadyError(getApiErrorMessage(err));
      } finally {
        if (!cancelled && initialLoad) {
          initialLoad = false;
          setMyMatchesLoading(false);
        }
      }
    }

    void loadMyMatches();
    const intervalId = window.setInterval(() => void loadMyMatches(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [id, isAuthenticated]);

  async function handleRegistrationSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id || !registrationTeamId) return;

    setRegistrationSubmitting(true);
    setRegistrationError("");
    setRegistrationSuccess("");
    try {
      const application = await requestChampionshipApplicationRequest(id, registrationTeamId);
      setMyApplications((current) => [application, ...current.filter((item) => item.id !== application.id)]);
      setRegistrationSuccess(
        (championship?.registrationFeeCents || 0) > 0
          ? "Solicitacao criada. Gere o PIX abaixo para concluir o pagamento."
          : "Solicitacao enviada. Aguarde a analise do administrador."
      );
    } catch (err) {
      setRegistrationError(getApiErrorMessage(err));
    } finally {
      setRegistrationSubmitting(false);
    }
  }

  async function handleCreatePayment() {
    if (!selectedApplication) return;

    setPaymentSubmitting(true);
    setPaymentError("");
    try {
      const payment = await createApplicationPaymentRequest(selectedApplication.id);
      setApplicationPayment(payment);
    } catch (err) {
      setPaymentError(getApiErrorMessage(err));
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleReady(matchId: string) {
    setReadyMatchId(matchId);
    setReadyError("");
    try {
      const result = await markMatchReadyRequest(matchId);
      setMyMatches((current) =>
        current.map((match) =>
          match.id === matchId
            ? {
                ...match,
                readyTeamIds: result.readyTeamIds,
                startedAt: result.startedAt,
              }
            : match
        )
      );
    } catch (err) {
      setReadyError(getApiErrorMessage(err));
    } finally {
      setReadyMatchId("");
    }
  }

  if (loading) return <Loading label="Carregando campeonato..." />;
  if (error) return <div className="championship-detail-page mx-auto max-w-6xl px-4 py-10"><ErrorBox message={error} /></div>;
  if (!championship) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "standings", label: "Classificacao" },
    { key: "matches", label: "Partidas" },
    { key: "knockout", label: "Mata-mata" },
    { key: "teams", label: "Times" },
    { key: "stats", label: "Artilharia" },
  ];

  return (
    <div className="championship-detail-page mx-auto max-w-6xl px-4 py-10">
      <Link to="/" className="mb-4 inline-block text-sm text-slate-400 hover:text-accent-400">
        ← Voltar para campeonatos
      </Link>

      <div className="championship-heading card mb-6 flex flex-wrap items-start justify-between gap-3 p-6">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold">{championship.name}</h1>
            <StatusBadge status={championship.status} />
          </div>
          {championship.description && (
            <p className="max-w-2xl text-sm text-slate-400">{championship.description}</p>
          )}
        </div>
        {(championship.championTeamName || championship.championTeam) && (
          <div className="card px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-400">Campeao</p>
            <p className="text-lg font-bold text-accent-400">🏆 {championship.championTeamName || championship.championTeam?.name}</p>
          </div>
        )}
      </div>

      <section className="championship-prize-section">
        <div className="championship-detail-section-title"><span></span><h2>PREMIAÇÃO</h2></div>
        <div className="championship-prize-cards">
          {[
            ["1º LUGAR", calculatePrizeForTeams(championship, championship.maxTeams).first],
            ["2º LUGAR", calculatePrizeForTeams(championship, championship.maxTeams).second],
            ["3º LUGAR", calculatePrizeForTeams(championship, championship.maxTeams).third],
          ].map(([label, value], index) => (
            <div key={label} className={index === 0 ? "championship-prize-card first" : "championship-prize-card"}>
              <span>{label}</span>
              <strong>{formatPrize(value as number)}</strong>
              <small>NO PIX</small>
            </div>
          ))}
        </div>
      </section>

      {championship.stage === "REGISTRATION" && (
        <section className="card mb-6 border-accent-500/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Vagas abertas</p>
              <h2 className="mt-1 font-semibold">Quer participar deste campeonato?</h2>
              <p className="mt-1 text-sm text-slate-400">Solicite sua inscricao usando um time criado por voce.</p>
              <p className="mt-2 text-sm font-semibold text-accent-400">
                {championship.registrationFeeCents > 0
                  ? "Taxa: R$ " + (championship.registrationFeeCents / 100).toFixed(2).replace(".", ",")
                  : "Inscricao gratuita"}
              </p>
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
                <p className="mt-3 text-xs text-slate-500">Este time ja possui uma solicitacao para este campeonato.</p>
              )}
              {selectedApplication && championship.registrationFeeCents > 0 && (
                <div className="mt-4 rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Pagamento da inscricao</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {selectedApplication.status === "APPROVED"
                          ? "Inscricao aprovada automaticamente apos a confirmacao do pagamento."
                          : applicationPayment?.status === "APPROVED"
                            ? "Pagamento aprovado. A inscricao sera aprovada automaticamente."
                            : applicationPayment?.status === "PENDING"
                            ? "PIX pendente. Pague para liberar a analise da inscricao."
                            : "Gere um PIX para pagar a taxa do campeonato."}
                      </p>
                    </div>
                    {applicationPayment?.status !== "APPROVED" && (
                      <button type="button" className="btn-primary" onClick={handleCreatePayment} disabled={paymentSubmitting || paymentLoading}>
                        {paymentSubmitting ? "Gerando PIX..." : applicationPayment ? "Gerar novo PIX" : "Gerar PIX"}
                      </button>
                    )}
                  </div>
                  {paymentLoading && <p className="mt-3 text-xs text-slate-500">Consultando pagamento...</p>}
                  {paymentError && <p className="mt-3 text-sm text-red-300">{paymentError}</p>}
                  {applicationPayment?.qrCode && applicationPayment.status !== "APPROVED" && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
                      {applicationPayment.qrCodeBase64 && (
                        <img
                          src={"data:image/png;base64," + applicationPayment.qrCodeBase64}
                          alt="QR Code PIX"
                          className="h-40 w-40 rounded-lg bg-white p-2"
                        />
                      )}
                      <div>
                        <label className="label">PIX copia e cola</label>
                        <textarea className="input min-h-24 text-xs" readOnly value={applicationPayment.qrCode} />
                        <button
                          type="button"
                          className="btn-secondary mt-2"
                          onClick={() => void navigator.clipboard?.writeText(applicationPayment.qrCode || "")}
                        >
                          Copiar codigo PIX
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="championship-format-section">
        <div className="championship-detail-section-title"><span></span><h2>FORMATO</h2></div>
        <div className="championship-format-panel">
          <div className="championship-groups-grid">
            {Array.from({ length: championship.numberOfGroups }, (_, index) => (
              <div key={index} className="championship-group-mark">
                <strong>{String.fromCharCode(65 + index)}</strong>
                <i></i><i></i><i></i><i></i>
              </div>
            ))}
          </div>
          <div className="championship-format-copy">
            <p><strong>{championship.numberOfGroups}</strong> grupos de <strong>{Math.ceil(championship.maxTeams / Math.max(championship.numberOfGroups, 1))}</strong>, com <strong>{championship.teamsQualifyingPerGroup}</strong> passando de cada.</p>
            <div><strong>{championship.numberOfGroups * championship.teamsQualifyingPerGroup}</strong><span>CLASSIFICAM</span></div>
          </div>
        </div>
      </section>

      <section className="championship-reduced-prizes">
        <h3>E SE NÃO ENCHER</h3>
        <p>A organização confirma o tamanho conforme os inscritos e o formato previsto. Cada tamanho tem sua premiação.</p>
        <p className="championship-reduced-note">O total distribuído é 80% das inscrições (taxa × quantidade de times) e diminui quando a edição fecha com menos times.</p>
        <div className="championship-prize-table">
          {Array.from({ length: Math.max(1, Math.ceil((championship.maxTeams - 8) / 4) + 1) }, (_, index) => championship.maxTeams - index * 4)
            .filter((size) => size >= 8)
            .concat(championship.maxTeams < 8 ? [championship.maxTeams] : [])
            .map((size, index, sizes) => {
              const prize = calculatePrizeForTeams(championship, size);
              return (
                <div key={`${size}-${index}`} className="championship-prize-row">
                  <span>Com {size} times</span>
                  <strong>{formatPrize(prize.first)} · {formatPrize(prize.second)} · {formatPrize(prize.third)}</strong>
                </div>
              );
            })}
        </div>
      </section>
      {isAuthenticated && championship.stage !== "REGISTRATION" && (
        <section className="card mb-6 border-accent-500/20 p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Sua agenda</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Minhas próximas partidas</h2>
            <p className="mt-1 text-sm text-slate-400">Confirme quando seu time estiver pronto para jogar.</p>
          </div>
          {readyError && <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{readyError}</p>}
          {myMatchesLoading ? (
            <p className="text-sm text-slate-500">Carregando suas partidas...</p>
          ) : myMatches.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma partida próxima agendada para o seu time.</p>
          ) : (
            <div className="space-y-3">
              {myMatches.map((match) => (
                <UpcomingMatchCard
                  key={match.id}
                  match={match}
                  loading={readyMatchId === match.id}
                  onReady={() => handleReady(match.id)}
                />
              ))}
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

      {tabLoading ? (
        <Loading label="Carregando conteúdo da aba..." />
      ) : tabError ? (
        <ErrorBox message={tabError} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function UpcomingMatchCard({
  match,
  loading,
  onReady,
}: {
  match: Match;
  loading: boolean;
  onReady: () => void;
}) {
  const myTeamReady = Boolean(match.myTeamId && match.readyTeamIds?.includes(match.myTeamId));
  const homeReady = Boolean(match.homeTeamId && match.readyTeamIds?.includes(match.homeTeamId));
  const awayReady = Boolean(match.awayTeamId && match.readyTeamIds?.includes(match.awayTeamId));
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSending, setDisputeSending] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState("");
  const [disputeError, setDisputeError] = useState("");

  async function submitDispute(event: FormEvent) {
    event.preventDefault();
    if (!disputeReason.trim()) return;
    setDisputeSending(true);
    setDisputeError("");
    setDisputeMessage("");
    try {
      await openMatchDisputeRequest(match.id, disputeReason.trim());
      setDisputeReason("");
      setShowDispute(false);
      setDisputeMessage("Disputa enviada para an�lise do administrador.");
    } catch (err) {
      setDisputeError(getApiErrorMessage(err));
    } finally {
      setDisputeSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-base-700 bg-base-900/60 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {match.round || "Fase de grupos"}{match.group ? " · Grupo " + match.group.name : ""}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-100">
            {match.homeTeam?.name || "A definir"} <span className="px-1 text-slate-500">x</span> {match.awayTeam?.name || "A definir"}
          </p>
          {match.scheduledAt && <p className="mt-1 text-xs text-accent-400">Agendada: {new Date(match.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
            <span className={homeReady ? "text-accent-400" : "text-slate-600"}>{homeReady ? "Casa pronta" : "Casa aguardando"}</span>
            <span className={awayReady ? "text-accent-400" : "text-slate-600"}>{awayReady ? "Fora pronto" : "Fora aguardando"}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={myTeamReady ? "btn-secondary shrink-0" : "btn-primary shrink-0"} onClick={onReady} disabled={loading || myTeamReady}>
            {loading ? "Confirmando..." : myTeamReady ? "Seu time est� pronto" : "Estou pronto"}
          </button>


          <button type="button" className="btn-secondary shrink-0" onClick={() => { setShowDispute((current) => !current); setDisputeError(""); }}>
            {showDispute ? "Fechar disputa" : "Abrir disputa"}
          </button>
      <MatchChat
        matchId={match.id}
        matchStatus={match.status}
        autoOpen={homeReady && awayReady}
      />
      {showDispute && (
        <form onSubmit={submitDispute} className="mt-3 space-y-2 border-t border-base-700 pt-3">
          <label className="label" htmlFor={"dispute-" + match.id}>Descreva o problema</label>
          <textarea id={"dispute-" + match.id} className="input min-h-24 resize-y" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} minLength={10} maxLength={1000} placeholder="Informe o que aconteceu nesta partida." disabled={disputeSending} />
          <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={disputeSending || disputeReason.trim().length < 10}>{disputeSending ? "Enviando..." : "Enviar disputa"}</button></div>
        </form>
      )}
      {disputeMessage && <p className="mt-2 text-xs text-emerald-300">{disputeMessage}</p>}
      {disputeError && <p className="mt-2 text-xs text-red-300">{disputeError}</p>}
        </div>
      </div>
    </div>
  );
}
