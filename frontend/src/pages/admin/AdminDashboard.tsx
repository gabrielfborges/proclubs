import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchChampionships,
  createChampionshipRequest,
  deleteChampionshipRequest,
} from "../../api/championships";
import { Championship } from "../../types";
import { Loading, ErrorBox } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { getApiErrorMessage } from "../../api/client";

const emptyForm = {
  name: "",
  description: "",
  maxTeams: 8,
  numberOfGroups: 2,
  teamsQualifyingPerGroup: 2,
};

export function AdminDashboard() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    setLoading(true);
    fetchChampionships()
      .then(setChampionships)
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
              </div>
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
