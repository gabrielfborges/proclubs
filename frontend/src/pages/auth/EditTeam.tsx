import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createTeamPlayerRequest,
  deleteTeamPlayerRequest,
  fetchMyTeamsRequest,
  fetchTeamPlayersRequest,
  syncTeamPlayersRequest,
  updateOwnTeamRequest,
} from "../../api/championships";
import { getApiErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/Loading";
import { Player, UserTeam } from "../../types";

export function EditTeam() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedId, setSelectedId] = useState(id || "");
  const [teamName, setTeamName] = useState("");
  const [eaClubId, setEaClubId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedId) || null,
    [teams, selectedId]
  );

  useEffect(() => {
    fetchMyTeamsRequest()
      .then((list) => {
        setTeams(list);
        const nextId = id && list.some((team) => team.id === id) ? id : list[0]?.id || "";
        setSelectedId(nextId);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedTeam) return;
    setTeamName(selectedTeam.name);
    setEaClubId(selectedTeam.eaClubId || "");
    setLogoUrl(selectedTeam.logoUrl || "");
    setError("");
    fetchTeamPlayersRequest(selectedTeam.id)
      .then(setPlayers)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [selectedTeam]);

  function selectTeam(nextId: string) {
    setSelectedId(nextId);
    navigate(nextId ? "/times/editar/" + nextId : "/times");
  }

  async function handleTeamSave(event: FormEvent) {
    event.preventDefault();
    if (!selectedTeam) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateOwnTeamRequest(selectedTeam.id, {
        name: teamName.trim(),
        eaClubId: eaClubId.trim(),
        logoUrl: logoUrl.trim() || undefined,
      });
      setTeams((current) =>
        current.map((team) => (team.id === updated.id ? { ...team, ...updated } : team))
      );
      setMessage("Dados do time atualizados.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedTeam) return;
    setSyncLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await syncTeamPlayersRequest(selectedTeam.id);
      setPlayers(result.players);
      setMessage(
        result.added +
          " jogador(es) adicionado(s) pela EA" +
          (result.updated ? " · " + result.updated + " atualizado(s)" : "") +
          "."
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleAddPlayer(event: FormEvent) {
    event.preventDefault();
    if (!selectedTeam || !playerName.trim()) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const player = await createTeamPlayerRequest(selectedTeam.id, {
        name: playerName.trim(),
        position: playerPosition.trim() || undefined,
      });
      setPlayers((current) => [...current, player].sort((a, b) => a.name.localeCompare(b.name)));
      setPlayerName("");
      setPlayerPosition("");
      setMessage("Jogador adicionado manualmente.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeletePlayer(player: Player) {
    if (!selectedTeam || !window.confirm("Remover " + player.name + " do time?")) return;
    setActionLoading(true);
    setError("");
    try {
      await deleteTeamPlayerRequest(selectedTeam.id, player.id);
      setPlayers((current) => current.filter((item) => item.id !== player.id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Loading label="Carregando seus times..." />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Gestão do elenco</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Editar time</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Atualize os dados do clube, sincronize os jogadores da EA e cadastre manualmente quem não aparecer na consulta.
          </p>
        </div>
        <Link to="/times/criar" className="btn-secondary">+ Criar outro time</Link>
      </div>

      {error && <div className="mb-5"><ErrorBox message={error} /></div>}
      {message && <p className="mb-5 rounded-lg border border-accent-500/20 bg-accent-500/10 px-4 py-3 text-sm text-accent-300">{message}</p>}

      {teams.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold">Você ainda não tem um time</h2>
          <p className="mt-2 text-sm text-slate-400">Crie seu primeiro time para começar a montar o elenco.</p>
          <Link to="/times/criar" className="btn-primary mt-5">Criar time</Link>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2 border-b border-base-700">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => selectTeam(team.id)}
                className={"border-b-2 px-4 py-2 text-sm font-medium transition-colors " + (selectedId === team.id ? "border-accent-500 text-accent-400" : "border-transparent text-slate-400 hover:text-slate-200")}
              >
                {team.name}
              </button>
            ))}
          </div>

          {selectedTeam && (
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <section className="card p-5">
                <h2 className="text-lg font-semibold">Dados do time</h2>
                <p className="mt-1 text-sm text-slate-500">O EaClubId é usado para localizar o elenco na EA.</p>
                <form onSubmit={handleTeamSave} className="mt-5 space-y-4">
                  <div><label className="label">Nome do time</label><input className="input" value={teamName} onChange={(event) => setTeamName(event.target.value)} required minLength={2} /></div>
                  <div><label className="label">EaClubId</label><input className="input font-mono" value={eaClubId} onChange={(event) => setEaClubId(event.target.value.replace(/[^0-9]/g, ""))} required /></div>
                  <div><label className="label">Logo (opcional)</label><input className="input" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://..." /></div>
                  <button className="btn-primary w-full" disabled={actionLoading}>{actionLoading ? "Salvando..." : "Salvar alterações"}</button>
                </form>
              </section>

              <section className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-lg font-semibold">Jogadores do time</h2><p className="mt-1 text-sm text-slate-500">{players.length} jogador(es) salvo(s). Os manuais não são removidos pela sincronização.</p></div>
                  <button className="btn-secondary !border-accent-500/40 !text-accent-300" onClick={handleSync} disabled={syncLoading || !eaClubId}>{syncLoading ? "Sincronizando..." : "Sincronizar jogadores"}</button>
                </div>

                <form onSubmit={handleAddPlayer} className="mt-5 grid gap-3 rounded-lg border border-base-700 bg-base-800/50 p-3 sm:grid-cols-[1fr_0.55fr_auto] sm:items-end">
                  <div><label className="label">Adicionar jogador</label><input className="input" value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Nome que não veio da EA" required /></div>
                  <div><label className="label">Posição (opcional)</label><input className="input" value={playerPosition} onChange={(event) => setPlayerPosition(event.target.value)} placeholder="Ex.: ATA" /></div>
                  <button className="btn-primary" disabled={actionLoading}>{actionLoading ? "..." : "Adicionar"}</button>
                </form>

                <div className="mt-5 divide-y divide-base-700 rounded-lg border border-base-700">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-sm font-bold text-accent-300">{player.name.slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0"><p className="truncate font-medium text-slate-200">{player.name}</p><p className="mt-0.5 text-xs text-slate-500">{player.position || "Posição não informada"} · {player.isManual ? "Adicionado manualmente" : "Sincronizado pela EA"}</p></div>
                      </div>
                      <button className="shrink-0 text-xs text-red-300 hover:text-red-200" onClick={() => handleDeletePlayer(player)} disabled={actionLoading}>Remover</button>
                    </div>
                  ))}
                  {players.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhum jogador cadastrado. Sincronize com a EA ou adicione o primeiro manualmente.</p>}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}