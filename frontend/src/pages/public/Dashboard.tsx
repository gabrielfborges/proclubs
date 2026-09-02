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
    () => championships.filter((c) => c.status === tab),
    [championships, tab]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 discover-page">
      <div className="mb-10">
        <h1 className="text-4xl font-black uppercase">Campeonatos</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Acompanhe os campeonatos de EA Sports FC Pro Clubs cadastrados na plataforma.
        </p>
      </div>

      <div className="mb-8 flex gap-2 border-b border-base-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-accent-500 text-accent-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Carregando campeonatos..." />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div className="discovery-list">
          {filtered.map((champ) => (
            <Link
              key={champ.id}
              to={`/campeonatos/${champ.id}`}
              className="discovery-row"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{champ.name}</h3>
                <StatusBadge status={champ.status} />
              </div>
              {champ.description && (
                <p className="line-clamp-2 text-sm text-slate-400">{champ.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                <span>
                  {champ.teams?.length ?? 0}/{champ.maxTeams} times
                </span>
                {champ.championTeam && (
                  <span className="text-accent-400">🏆 {champ.championTeam.name}</span>
                )}
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-500">
              Nenhum campeonato nesta categoria no momento.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
