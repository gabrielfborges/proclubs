import { Match } from "../types";

export function MatchList({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Nenhuma partida cadastrada.</p>;
  }

  return (
    <div className="space-y-2">
      {matches.map((match) => (
        <div
          key={match.id}
          className="card flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {match.round && <span>{match.round}</span>}
            {match.group && <span className="text-slate-600">• Grupo {match.group.name}</span>}
          </div>

          <div className="flex flex-1 items-center justify-center gap-3 sm:gap-6">
            <span className="flex-1 text-right font-medium sm:flex-none sm:w-40">
              {match.homeTeam?.name ?? "A definir"}
            </span>

            {match.status === "PLAYED" ? (
              <span className="rounded-md bg-base-800 px-3 py-1 font-bold text-accent-400">
                {match.homeScore} x {match.awayScore}
                {match.homePenalty != null && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (pen. {match.homePenalty}-{match.awayPenalty})
                  </span>
                )}
              </span>
            ) : (
              <span className="rounded-md bg-base-800 px-3 py-1 text-xs text-slate-500">
                a definir
              </span>
            )}

            <span className="flex-1 text-left font-medium sm:flex-none sm:w-40">
              {match.awayTeam?.name ?? (match.homeTeamId ? "BYE" : "A definir")}
            </span>
          </div>

          <div className="text-right text-xs">
            {match.status === "PLAYED" ? (
              <div>
                <span className="text-accent-400">Encerrada</span>
                {match.resultType !== "REGULAR" && <p className="mt-1 text-[10px] text-amber-300">Resultado por W.O.</p>}
              </div>
            ) : (
              <div>
                <span className="text-slate-500">Agendada</span>
                {match.scheduledAt && <p className="mt-1 text-slate-400">{new Date(match.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
