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

  return (
    <div className="championships-page">
      <section className="championships-page-header">
        <div>
          <p className="section-eyebrow">CENTRAL DE DISPUTAS</p>
          <h1>CAMPEONATOS</h1>
          <p className="championships-intro">Escolha sua edição, inscreva seu club e acompanhe cada etapa da competição.</p>
        </div>
        <div className="championships-counter">
          <strong>{championships.length}</strong>
          <span>edições cadastradas</span>
        </div>
      </section>

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

      {loading && <Loading label="Carregando campeonatos..." />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
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
                  <h2>{championship.name}</h2>
                  <p>{championship.description || "Disputa oficial de EA Sports FC Pro Clubs."}</p>
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
      )}
    </div>
  );
}