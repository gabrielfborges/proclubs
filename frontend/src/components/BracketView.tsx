import { Match } from "../types";

function groupByRound(matches: Match[]) {
  const rounds = new Map<string, Match[]>();
  for (const match of matches) {
    const key = match.round || "Mata-mata";
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key)!.push(match);
  }
  for (const list of rounds.values()) {
    list.sort((a, b) => (a.roundOrder || 0) - (b.roundOrder || 0));
  }
  return Array.from(rounds.entries());
}

export function BracketView({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        O mata-mata ainda nao foi gerado para este campeonato.
      </p>
    );
  }

  const rounds = groupByRound(matches);

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map(([roundName, roundMatches]) => (
        <div key={roundName} className="flex min-w-[240px] flex-col gap-4">
          <h4 className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {roundName}
          </h4>
          <div className="flex flex-1 flex-col justify-around gap-4">
            {roundMatches.map((match) => (
              <div key={match.id} className="card px-3 py-2 text-sm">
                <TeamRow
                  name={match.homeTeam?.name ?? (match.awayTeamId ? "A definir" : "BYE")}
                  score={match.homeScore}
                  winner={match.winnerTeamId === match.homeTeamId && !!match.winnerTeamId}
                />
                <div className="my-1 border-t border-base-700" />
                <TeamRow
                  name={match.awayTeam?.name ?? (match.homeTeamId && !match.awayTeamId ? "BYE" : "A definir")}
                  score={match.awayScore}
                  winner={match.winnerTeamId === match.awayTeamId && !!match.winnerTeamId}
                />
                {match.homePenalty != null && (
                  <p className="mt-1 text-center text-[10px] text-slate-500">
                    Penaltis: {match.homePenalty} x {match.awayPenalty}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamRow({ name, score, winner }: { name: string; score: number | null; winner: boolean }) {
  return (
    <div className={`flex items-center justify-between ${winner ? "text-accent-400 font-semibold" : "text-slate-200"}`}>
      <span className="truncate">{name}</span>
      <span className="ml-2 text-slate-400">{score ?? "-"}</span>
    </div>
  );
}
