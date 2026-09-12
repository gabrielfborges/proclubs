import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchChampionships } from "../../api/championships";
import { Championship, ChampionshipStatus } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { getApiErrorMessage } from "../../api/client";

const TABS: { key: ChampionshipStatus; label: string }[] = [
  { key: "OPEN", label: "Abertos" },
  { key: "IN_PROGRESS", label: "Em andamento" },
  { key: "FINISHED", label: "Finalizados" },
];

function formatFee(cents: number) {
  return cents > 0 ? `R$ ${(cents / 100).toFixed(2).replace(".", ",")}` : "Grátis";
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Data e horário a definir";
}
export function Championships() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [tab, setTab] = useState<ChampionshipStatus>("OPEN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChampionships()
      .then(setChampionships)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => championships.filter((championship) => championship.status === tab),
    [championships, tab]
  );
  const nextChampionship = championships.find((championship) => championship.status === "OPEN") || championships[0] || null;

  return (
    <div className="championships-page">
      <section className="championships-spotlight">
        <div className="championships-spotlight-heading">
          <p className="section-eyebrow">AGENDA DA COMUNIDADE</p>
          <h1>O PRÓXIMO CAMPEONATO</h1>
        </div>
        <a href="#todos-campeonatos" className="section-link">Ver todos <span>→</span></a>
      </section>

      {loading && <Loading label="Carregando campeonatos..." />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <>
          {nextChampionship ? (
            <Link to={`/campeonatos/${nextChampionship.id}`} className="championship-next-card">
              <div className="championship-next-badges">
                <StatusBadge status={nextChampionship.status} />
                <span className="soft-badge">GERAÇÃO ATUAL</span>
              </div>
              <h2>{nextChampionship.name}</h2>
              <div className="championship-next-info">
                <div>
                  <span>INSCRIÇÃO POR CLUB</span>
                  <strong>{formatFee(nextChampionship.registrationFeeCents)}</strong>
                </div>
                <div>
                  <span>VAGAS</span>
                  <strong>{nextChampionship.teams?.length || 0}/{nextChampionship.maxTeams}</strong>
                </div>
              </div>
              <p className="championship-next-description">
                {nextChampionship.description || "Monte seu time e entre na disputa pelo título."}
              </p>              <div className="championship-next-prizes">
                <div><span>1º LUGAR</span><strong>{formatFee(nextChampionship.prizeFirstCents)}</strong></div>
                <div><span>2º LUGAR</span><strong>{formatFee(nextChampionship.prizeSecondCents)}</strong></div>
                <div><span>3º LUGAR</span><strong>{formatFee(nextChampionship.prizeThirdCents)}</strong></div>
              </div>
              <p className="championship-next-meta">
                <span aria-hidden="true">▣</span> {formatDateTime(nextChampionship.startsAt)} · {nextChampionship.teams?.length || 0} times inscritos · Até {nextChampionship.maxTeams} times · {nextChampionship.numberOfGroups} grupos
              </p>
              <div className="championship-next-footer">
                <strong>{nextChampionship.status === "OPEN" ? "Ver edição e inscrição" : "Acompanhar campeonato"}</strong>
                <span>→</span>
              </div>
            </Link>
          ) : (
            <div className="championship-next-card empty-featured">
              <p className="section-eyebrow">AGUARDANDO NOVA EDIÇÃO</p>
              <h2>Nenhum campeonato disponível</h2>
              <p>Assim que uma nova disputa for criada, ela aparecerá aqui.</p>
            </div>
          )}

          <section id="todos-campeonatos" className="championships-catalogue">
            <div className="championships-catalogue-heading">
              <div>
                <p className="section-eyebrow">CALENDÁRIO COMPLETO</p>
                <h2>TODOS OS CAMPEONATOS</h2>
              </div>
              <span className="championships-counter">{championships.length} edições</span>
            </div>

            <div className="championships-toolbar">
              <div className="catalogue-tabs" role="tablist" aria-label="Filtrar campeonatos">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={tab === item.key ? "catalogue-tab active" : "catalogue-tab"}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="championships-toolbar-note">Atualizado em tempo real</span>
            </div>

            <div className="championships-only-list">
              {filtered.map((championship) => {
                const confirmedTeams = championship.teams?.length || 0;
                const progress = championship.maxTeams ? Math.min(100, (confirmedTeams / championship.maxTeams) * 100) : 0;

                return (
                  <Link key={championship.id} to={`/campeonatos/${championship.id}`} className="championship-list-card">
                    <div className="championship-list-main">
                      <div className="featured-badges">
                        <StatusBadge status={championship.status} />
                        <span className="soft-badge">{championship.numberOfGroups} GRUPOS</span>
                      </div>
                      <h3>{championship.name}</h3>
                      <p>{championship.description || "Disputa oficial de EA Sports FC Pro Clubs."}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(championship.startsAt)} · Prêmios: {formatFee(championship.prizeFirstCents)} / {formatFee(championship.prizeSecondCents)} / {formatFee(championship.prizeThirdCents)}</p>
                      <div className="championship-list-progress">
                        <div className="progress-label"><span>{confirmedTeams} times confirmados</span><span>{championship.maxTeams} vagas</span></div>
                        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                      </div>
                    </div>
                    <div className="championship-list-side">
                      <div><span>INSCRIÇÃO</span><strong>{formatFee(championship.registrationFeeCents)}</strong></div>
                      <div><span>FORMATO</span><strong>{championship.numberOfGroups} grupos</strong></div>
                      <span className="championship-open-link">Ver edição <b>→</b></span>
                    </div>
                  </Link>
                );
              })}
              {filtered.length === 0 && <p className="empty-championships">Nenhum campeonato nesta categoria no momento.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}