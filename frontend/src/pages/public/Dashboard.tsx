import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchChampionships } from "../../api/championships";
import { Championship, ChampionshipStatus } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { getApiErrorMessage } from "../../api/client";
import { calculatePrizeForTeams, formatPrize } from "../../utils/prizes";

const TABS: { key: ChampionshipStatus; label: string }[] = [
  { key: "OPEN", label: "Abertos" },
  { key: "IN_PROGRESS", label: "Em andamento" },
  { key: "FINISHED", label: "Finalizados" },
];

function money(cents: number) {
  return cents > 0 ? `R$ ${(cents / 100).toFixed(2).replace(".", ",")}` : "Grátis";
}

function teamInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function Dashboard() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ChampionshipStatus>("OPEN");

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
  const featured = championships.find((championship) => championship.status === "OPEN") || championships[0] || null;
  const featuredTeams = featured?.teams?.slice(0, 4) || [];
  const confirmedTeams = featured?.teams?.length || 0;
  const progress = featured ? Math.min(100, (confirmedTeams / featured.maxTeams) * 100) : 0;

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="hero-kicker">CAMPEONATO DE</p>
          <h1>
            <span>PRO CLUBS</span>
            <strong>COM O SEU CLUB</strong>
          </h1>
          <p className="hero-lead">
            Seu club em campo. <em>A disputa organizada</em>, do primeiro jogo à taça.
          </p>
          <div className="hero-actions">
            <Link to="/campeonatos" className="btn-primary hero-cta">
              QUERO JOGAR
            </Link>
            <span className="hero-note">Inscreva seu club no próximo campeonato</span>
          </div>
          <span className="hero-download">Calendário, grupos e resultados em um só lugar</span>
        </div>
        <HeroBracket teams={featuredTeams.map((team) => team.name)} />
      </section>

      <section className="home-section home-next-section">
        <div className="home-section-heading">
          <div>
            <p className="section-eyebrow">AGENDA DA COMUNIDADE</p>
            <h2>SEU PRÓXIMO CAMPEONATO</h2>
          </div>
          <Link to="/" className="section-link">Ver todos os campeonatos <span>→</span></Link>
        </div>

        <div className="home-feature-grid">
          {featured ? (
            <Link to={`/campeonatos/${featured.id}`} className="featured-championship">
              <div className="featured-topline">
                <div className="featured-badges">
                  <StatusBadge status={featured.status} />
                  <span className="soft-badge">GERAÇÃO ATUAL</span>
                </div>
                <span className="featured-arrow">↗</span>
              </div>
              <h3>{featured.name}</h3>
              <div className="featured-info-grid">
                <div>
                  <span>INSCRIÇÃO POR CLUB</span>
                  <strong className="accent-text">{money(featured.registrationFeeCents)}</strong>
                </div>
                <div>
                  <span>VAGAS</span>
                  <strong>{confirmedTeams}/{featured.maxTeams}</strong>
                </div>
              </div>
              <div className="featured-progress">
                <div className="progress-label"><span>{confirmedTeams} clubs inscritos</span><span>{Math.max(featured.maxTeams - confirmedTeams, 0)} vagas livres</span></div>
                <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              </div>
              <p className="featured-description">{featured.description || "Monte seu time e entre na disputa pelo título."}</p>
              <div className="featured-prizes">
                <span>1º {formatPrize(calculatePrizeForTeams(featured, featured.maxTeams).first)}</span>
                <span>2º {formatPrize(calculatePrizeForTeams(featured, featured.maxTeams).second)}</span>
                <span>3º {formatPrize(calculatePrizeForTeams(featured, featured.maxTeams).third)}</span>
              </div>
              <div className="featured-footer"><span>⌁ Inscrições abertas</span><span>Ver campeonato →</span></div>
            </Link>
          ) : (
            <div className="featured-championship empty-featured">
              <p className="section-eyebrow">AGUARDANDO NOVA EDIÇÃO</p>
              <h3>Nenhum campeonato disponível</h3>
              <p>Assim que uma nova disputa for criada, ela aparecerá aqui.</p>
            </div>
          )}

          <div className="how-it-works">
            <p className="section-eyebrow">COMO FUNCIONA</p>
            <h3>DO PRIMEIRO JOGO À TAÇA</h3>
            <HowStep number="1" title="Escolha a edição" text="Confira as vagas, a taxa e o formato da disputa." />
            <HowStep number="2" title="Acompanhe a disputa" text="Grupos, chave e horários ficam na página do campeonato." />
            <HowStep number="3" title="Confirme o resultado" text="Jogue, confirme o placar e avance na competição." />
          </div>
        </div>
      </section>

      <section className="home-section home-catalogue">
        <div className="home-section-heading catalogue-heading">
          <div>
            <p className="section-eyebrow">CALENDÁRIO COMPLETO</p>
            <h2>CAMPEONATOS</h2>
          </div>
          <div className="catalogue-tabs" role="tablist" aria-label="Filtrar campeonatos">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={tab === item.key ? "catalogue-tab active" : "catalogue-tab"}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <Loading label="Carregando campeonatos..." />}
        {error && <ErrorBox message={error} />}

        {!loading && !error && (
          <div className="discovery-list">
            {filtered.map((championship) => (
              <Link key={championship.id} to={`/campeonatos/${championship.id}`} className="discovery-row">
                <div>
                  <div className="flex items-center gap-2">
                    <h3>{championship.name}</h3>
                    <StatusBadge status={championship.status} />
                  </div>
                  {championship.description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{championship.description}</p>}
                </div>
                <p className="text-sm text-slate-400">{championship.teams?.length ?? 0}/{championship.maxTeams} times confirmados</p>
                <div className="text-right text-xs text-slate-500">
                  <span className="block text-accent-400">{money(championship.registrationFeeCents)}</span>
                  {(championship.championTeamName || championship.championTeam) && <span className="mt-1 block">🏆 {championship.championTeamName || championship.championTeam?.name}</span>}
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Nenhum campeonato nesta categoria no momento.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function HowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="how-step">
      <span className="how-number">{number}</span>
      <div><strong>{title}</strong><p>{text}</p></div>
    </div>
  );
}

function HeroBracket({ teams }: { teams: string[] }) {
  const names = [...teams, "Time convidado", "A definir", "A definir", "A definir"].slice(0, 4);
  return (
    <div className="hero-bracket" aria-label="Exemplo de chaveamento de campeonato">
      <div className="bracket-heading"><strong>RACHÃO PRO CLUBS</strong><span>EXEMPLO</span></div>
      <div className="bracket-labels"><span>SEMIFINAL</span><span>🏆 FINAL</span></div>
      <div className="bracket-board">
        <div className="bracket-column">
          <MiniMatch first={names[0]} second={names[1]} score="2 — 0" />
          <MiniMatch first={names[2]} second={names[3]} score="1 — 1" />
        </div>
        <div className="bracket-column final-column">
          <MiniMatch first={names[0]} second={names[2]} score="3 — 1" highlight />
        </div>
      </div>
      <div className="bracket-champion"><span>🏆 CAMPEÃO</span><strong>{names[0]}</strong></div>
    </div>
  );
}

function MiniMatch({ first, second, score, highlight = false }: { first: string; second: string; score: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "mini-match highlight" : "mini-match"}>
      <div><span className="team-mark">T1</span><strong>{first}</strong><b>{score.split(" — ")[0]}</b></div>
      <div><span className="team-mark muted">T2</span><span>{second}</span><b>{score.split(" — ")[1]}</b></div>
    </div>
  );
}