import { ChampionshipStatistics } from "../types";

export function ChampionshipStatisticsPanel({ statistics }: { statistics: ChampionshipStatistics }) {
  const ranking = (kind: "goals" | "assists") => kind === "goals" ? statistics.scorers : statistics.assisters;
  const label = (kind: "goals" | "assists") => kind === "goals" ? "Gols" : "Assistências";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {(["goals", "assists"] as const).map((kind) => (
        <section key={kind} className="card overflow-hidden">
          <div className="border-b border-base-700 px-4 py-3">
            <h2 className="font-semibold text-slate-100">{kind === "goals" ? "Artilheiros" : "Maiores assistentes"}</h2>
            <p className="mt-1 text-xs text-slate-500">Ranking acumulado nas partidas encerradas · {label(kind)}</p>
          </div>
          {ranking(kind).length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma estatística lançada ainda.</p> : (
            <div className="divide-y divide-base-700">
              {ranking(kind).slice(0, 10).map((row, index) => {
                const value = kind === "goals" ? row.goals || 0 : row.assists || 0;
                return <div key={row.playerId} className="flex items-center gap-3 px-4 py-3"><span className="w-5 text-sm font-bold text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{row.playerName}</p><p className="truncate text-xs text-slate-500">{row.teamName}</p></div><span className="text-lg font-bold text-accent-400">{value}</span></div>;
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}