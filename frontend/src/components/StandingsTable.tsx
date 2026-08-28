import { StandingRow } from "../types";

export function StandingsTable({ rows, highlightTop = 0 }: { rows: StandingRow[]; highlightTop?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-700">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-base-800 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2 text-center">J</th>
            <th className="px-3 py-2 text-center">V</th>
            <th className="px-3 py-2 text-center">E</th>
            <th className="px-3 py-2 text-center">D</th>
            <th className="px-3 py-2 text-center">GP</th>
            <th className="px-3 py-2 text-center">GC</th>
            <th className="px-3 py-2 text-center">SG</th>
            <th className="px-3 py-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.teamId}
              className={`border-t border-base-700 ${
                highlightTop && index < highlightTop ? "bg-accent-500/5" : ""
              }`}
            >
              <td className="px-3 py-2 text-slate-400">{index + 1}</td>
              <td className="px-3 py-2 font-medium">{row.teamName}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.played}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.wins}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.draws}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.losses}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.goalsFor}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.goalsAgainst}</td>
              <td className="px-3 py-2 text-center text-slate-300">{row.goalDifference}</td>
              <td className="px-3 py-2 text-center font-bold text-accent-400">{row.points}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                Nenhum time neste grupo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
