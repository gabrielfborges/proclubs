import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createOwnTeamRequest, searchEaClubsRequest } from "../../api/championships";
import { getApiErrorMessage } from "../../api/client";
import { EaClubSearchResult, Team } from "../../types";
import { ErrorBox } from "../../components/Loading";

export function CreateTeam() {
  const [teamName, setTeamName] = useState("");
  const [clubs, setClubs] = useState<EaClubSearchResult[]>([]);
  const [selectedClub, setSelectedClub] = useState<EaClubSearchResult | null>(null);
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchMessage, setSearchMessage] = useState("");

  function handleNameChange(value: string) {
    setTeamName(value);
    setSelectedClub(null);
    setClubs([]);
    setSearchMessage("");
    setError("");
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const name = teamName.trim();
    if (name.length < 2) {
      setSearchMessage("Digite pelo menos 2 caracteres para buscar o clube na EA.");
      return;
    }

    setSearching(true);
    setSearchMessage("");
    setError("");
    try {
      const results = await searchEaClubsRequest(name);
      setClubs(results);
      setSelectedClub(null);
      setSearchMessage(results.length ? "Selecione o clube correto para continuar." : "Nenhum clube encontrado com esse nome.");
    } catch (err) {
      setClubs([]);
      setSearchMessage("");
      setError(getApiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setCreatedTeam(null);
    setTeamName("");
    setClubs([]);
    setSelectedClub(null);
    setSearchMessage("");
    setError("");
  }

  async function handleCreate() {
    if (!selectedClub || teamName.trim().length < 2) return;

    setSubmitting(true);
    setError("");
    try {
      const team = await createOwnTeamRequest({
        name: teamName.trim(),
        eaClubId: selectedClub.clubId,
      });
      setCreatedTeam(team);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="mb-5 inline-block text-sm text-slate-400 hover:text-accent-400">
        ← Voltar para campeonatos
      </Link>

      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Novo cadastro</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Criar meu time</h1>
        <p className="mt-2 text-slate-400">
          Informe o nome do clube, encontre o registro correspondente na EA e confirme o ID antes de salvar.
        </p>
      </div>

      {error && <div className="mb-5"><ErrorBox message={error} /></div>}

      {createdTeam ? (
        <div className="card border-accent-500/50 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/15 text-2xl text-accent-400">✓</div>
          <h2 className="mt-4 text-xl font-semibold">Time criado com sucesso</h2>
          <p className="mt-2 text-sm text-slate-400">
            <span className="font-medium text-slate-200">{createdTeam.name}</span> foi salvo no seu perfil como capitão, com o ID EA {createdTeam.eaClubId}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/" className="btn-primary">Voltar aos campeonatos</Link>
            <button className="btn-secondary" onClick={resetForm}>Criar outro time</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="card p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-sm font-bold text-accent-400">1</div>
              <div>
                <h2 className="font-semibold">Encontre seu clube na EA</h2>
                <p className="mt-1 text-sm text-slate-500">A busca retorna os nomes e IDs disponíveis na plataforma.</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="label">Nome do time</label>
                <input
                  className="input"
                  value={teamName}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ex.: Fenix FC"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn-primary sm:shrink-0" disabled={searching}>
                {searching ? "Buscando..." : "Buscar na EA"}
              </button>
            </form>

            {searchMessage && <p className="mt-3 text-sm text-slate-400">{searchMessage}</p>}

            {clubs.length > 0 && (
              <div className="mt-5 space-y-2">
                {clubs.map((club) => {
                  const isSelected = selectedClub?.clubId === club.clubId;
                  return (
                    <button
                      type="button"
                      key={club.clubId}
                      onClick={() => setSelectedClub(club)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-accent-500 bg-accent-500/10 ring-1 ring-accent-500/40"
                          : "border-base-700 bg-base-800/50 hover:border-base-500"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-200">{club.name}</span>
                        <span className="mt-1 block text-xs text-slate-500">ID EA: {club.clubId}</span>
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${isSelected ? "text-accent-400" : "text-slate-500"}`}>
                        {isSelected ? "Selecionado" : "Usar este"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-sm font-bold text-accent-400">2</div>
              <div>
                <h2 className="font-semibold">Confirme o cadastro</h2>
                <p className="mt-1 text-sm text-slate-500">Confira os dados antes de criar o time.</p>
              </div>
            </div>

            <div className="rounded-lg border border-accent-500/20 bg-accent-500/5 p-3 text-sm text-slate-400">
              Este time ficará salvo no seu perfil e você será cadastrado como capitão. A inscrição em campeonatos é feita separadamente.
            </div>

            <div className="mt-5 rounded-lg border border-base-700 bg-base-800/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Resumo</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Nome do time</dt><dd className="text-right text-slate-200">{teamName.trim() || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Clube EA</dt><dd className="text-right text-slate-200">{selectedClub?.name || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">ID EA</dt><dd className="font-mono text-right text-accent-400">{selectedClub?.clubId || "—"}</dd></div>
              </dl>
            </div>

            <button
              type="button"
              className="btn-primary mt-5 w-full"
              disabled={submitting || !selectedClub || teamName.trim().length < 2}
              onClick={handleCreate}
            >
              {submitting ? "Criando time..." : "Confirmar e criar time"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">Nenhum campeonato será selecionado nesta etapa.</p>
          </section>
        </div>
      )}
    </main>
  );
}