import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchChampionships,
  fetchAdminSummaryRequest,
  createChampionshipRequest,
  deleteChampionshipRequest,
} from "../../api/championships";
import { AdminSummary, Championship } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { getApiErrorMessage } from "../../api/client";

const emptyForm = {
  name: "",
  description: "",
  maxTeams: 8,
  numberOfGroups: 2,
  teamsQualifyingPerGroup: 2,
  registrationFeeCents: 0,
  prizeFirstCents: 0,
  prizeSecondCents: 0,
  prizeThirdCents: 0,
  startsAt: "",
};
export function AdminDashboard() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([fetchChampionships(), fetchAdminSummaryRequest()])
      .then(([championshipList, adminSummary]) => {
        setChampionships(championshipList);
        setSummary(adminSummary);
        setError("");
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await createChampionshipRequest({
        name: form.name,
        description: form.description || undefined,
        maxTeams: Number(form.maxTeams),
        numberOfGroups: Number(form.numberOfGroups),
        teamsQualifyingPerGroup: Number(form.teamsQualifyingPerGroup),
        registrationFeeCents: Number(form.registrationFeeCents),
        prizeFirstCents: Number(form.prizeFirstCents),
        prizeSecondCents: Number(form.prizeSecondCents),
        prizeThirdCents: Number(form.prizeThirdCents),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      });
      setForm(emptyForm);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este campeonato? Essa acao nao pode ser desfeita.")) {
      return;
    }
    try {
      await deleteChampionshipRequest(id);
      load();
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel do administrador</h1>
          <p className="text-sm text-slate-400">Gerencie todos os campeonatos cadastrados.</p>
        </div>
        <button className="btn-primary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Cancelar" : "+ Novo campeonato"}
        </button>
      </div>

      {summary && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Campeonatos", summary.totalChampionships],
            ["Em andamento", summary.activeChampionships],
            ["Finalizados", summary.finishedChampionships],
            ["Times", summary.totalTeams],
            ["Inscricoes pendentes", summary.pendingApplications],
            ["Disputas abertas", summary.openDisputes],
            ["Partidas pendentes", summary.scheduledMatches],
            ["Partidas encerradas", summary.playedMatches],
          ].map(([label, value]) => (
            <div key={label} className="card px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-accent-400">{value}</p>
            </div>
          ))}
        </div>
      )}

      {summary && (summary.pendingApplications > 0 || summary.openDisputes > 0) && (
        <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Existem itens que precisam de revisao: {summary.pendingApplications} inscricao(oes) pendente(s) e {summary.openDisputes} disputa(s) aberta(s).
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleCreate} className="card mb-8 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome do campeonato</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descricao (opcional)</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Taxa de inscricao (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={(form.registrationFeeCents / 100).toFixed(2)}
              onChange={(e) => setForm({ ...form, registrationFeeCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })}
            />
            <p className="mt-1 text-xs text-slate-500">Use 0 para campeonato gratuito.</p>
          </div>

          <div className="sm:col-span-2 border-t border-base-700 pt-4">
            <p className="mb-3 text-sm font-semibold text-slate-200">Premiação e agenda</p>
            <p className="mb-3 text-xs text-slate-500">O total distribuído será 80% das inscrições. Estes valores definem a proporção entre os três lugares.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Referência 1º lugar (R$)</label>
                <input type="number" min={0} step="0.01" className="input" value={(form.prizeFirstCents / 100).toFixed(2)} onChange={(e) => setForm({ ...form, prizeFirstCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} />
              </div>
              <div>
                <label className="label">Referência 2º lugar (R$)</label>
                <input type="number" min={0} step="0.01" className="input" value={(form.prizeSecondCents / 100).toFixed(2)} onChange={(e) => setForm({ ...form, prizeSecondCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} />
              </div>
              <div>
                <label className="label">Referência 3º lugar (R$)</label>
                <input type="number" min={0} step="0.01" className="input" value={(form.prizeThirdCents / 100).toFixed(2)} onChange={(e) => setForm({ ...form, prizeThirdCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} />
              </div>
              <div>
                <label className="label">Data e horário de início</label>
                <input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Numero maximo de times</label>
            <input
              type="number"
              min={2}
              className="input"
              value={form.maxTeams}
              onChange={(e) => setForm({ ...form, maxTeams: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="label">Quantidade de grupos</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.numberOfGroups}
              onChange={(e) => setForm({ ...form, numberOfGroups: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="label">Classificados por grupo</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.teamsQualifyingPerGroup}
              onChange={(e) => setForm({ ...form, teamsQualifyingPerGroup: Number(e.target.value) })}
              required
            />
          </div>

          {formError && (
            <div className="sm:col-span-2">
              <ErrorBox message={formError} />
            </div>
          )}

          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Criar campeonato"}
            </button>
          </div>
        </form>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div className="space-y-3">
          {championships.map((champ) => (
            <div key={champ.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{champ.name}</h3>
                  <StatusBadge status={champ.status} />
                </div>
                <p className="text-xs text-slate-500">
                  {champ.teams?.length ?? 0}/{champ.maxTeams} times • {champ.numberOfGroups} grupo(s)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Prêmios: R$ {(champ.prizeFirstCents / 100).toFixed(2).replace(".", ",")} / R$ {(champ.prizeSecondCents / 100).toFixed(2).replace(".", ",")} / R$ {(champ.prizeThirdCents / 100).toFixed(2).replace(".", ",")}
                  {champ.startsAt ? ` • ${new Date(champ.startsAt).toLocaleString("pt-BR")}` : ""}
                </p>              </div>
              <div className="flex gap-2">
                <Link to={`/admin/campeonatos/${champ.id}`} className="btn-secondary">
                  Gerenciar
                </Link>
                <button className="btn-danger" onClick={() => handleDelete(champ.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}

          {championships.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Nenhum campeonato cadastrado ainda. Clique em "Novo campeonato" para comecar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
