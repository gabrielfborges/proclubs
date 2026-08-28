import { ChampionshipStatus } from "../types";

const STYLES: Record<ChampionshipStatus, string> = {
  OPEN: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  IN_PROGRESS: "bg-accent-500/15 text-accent-400 border border-accent-500/30",
  FINISHED: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
};

const LABELS: Record<ChampionshipStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado",
};

export function StatusBadge({ status }: { status: ChampionshipStatus }) {
  return <span className={`badge ${STYLES[status]}`}>{LABELS[status]}</span>;
}
