import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchChampionship,
  fetchStandings,
  fetchMatches,
  fetchKnockoutBracket,
} from "../../api/championships";
import { Championship, GroupStandings, Match } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { StandingsTable } from "../../components/StandingsTable";
import { MatchList } from "../../components/MatchList";
import { BracketView } from "../../components/BracketView";
import { getApiErrorMessage } from "../../api/client";

type TabKey = "standings" | "matches" | "knockout" | "teams";

export function ChampionshipDetail() {
  const { id } = useParams<{ id: string }>();
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("standings");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchChampionship(id),
      fetchStandings(id),
      fetchMatches(id, "GROUP"),
      fetchKnockoutBracket(id),
    ])
      .then(([champ, st, matches, knockout]) => {
        setChampionship(champ);
        setStandings(st);
        setGroupMatches(matches);
        setKnockoutMatches(knockout);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading label="Carregando campeonato..." />;
  if (error) return <div className="mx-auto max-w-6xl px-4 py-8"><ErrorBox message={error} /></div>;
  if (!championship) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "standings", label: "Classificacao" },
    { key: "matches", label: "Partidas" },
    { key: "knockout", label: "Mata-mata" },
    { key: "teams", label: "Times" },
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
