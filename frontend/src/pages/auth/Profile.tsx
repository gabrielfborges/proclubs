import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfileRequest } from "../../api/auth";
import { getApiErrorMessage } from "../../api/client";
import { ErrorBox } from "../../components/Loading";
import { useAuth } from "../../context/AuthContext";

function ProfileIcon({ type }: { type: "user" | "key" }) {
  return type === "user" ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c.7-3.7 3-5.5 7-5.5s6.3 1.8 7 5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="8.5" cy="15.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m11.5 12.5 7-7M16 5l3 3M14.5 8l2 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  async function saveUsername(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await updateProfileRequest({ username: username.trim() });
      updateUser(result.user);
      setUsername(result.user.username);
      setMessage("Nome de usuário atualizado.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== passwordConfirmation) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await updateProfileRequest({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      setMessage("Senha atualizada com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="page-kicker">Sua conta</p>
        <h1 className="mt-2 text-4xl font-black uppercase">Meu perfil</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Gerencie seus dados de acesso e mantenha sua conta atualizada.
        </p>
      </div>

      {error && <div className="mb-5"><ErrorBox message={error} /></div>}
      {message && <p className="mb-5 rounded-lg border border-accent-500/20 bg-accent-500/10 px-4 py-3 text-sm text-accent-300">{message}</p>}

      <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
        <section className="card p-5 sm:p-6">
          <div className="mb-7 flex items-center gap-3">
            <span className="profile-section-icon"><ProfileIcon type="user" /></span>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Dados da conta</h2>
              <p className="text-xs text-slate-500">Informações usadas no sistema</p>
            </div>
          </div>

          <div className="mb-7 flex items-center gap-4">
            <div className="profile-avatar">{user.username.slice(0, 2).toUpperCase()}</div>
            <div>
              <p className="font-semibold text-slate-100">{user.username}</p>
              <p className="text-xs text-slate-500">{user.role === "ADMIN" ? "Administrador" : "Membro da comunidade"}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="label">E-mail</label>
              <input className="input profile-readonly" value={user.email} readOnly />
              <p className="mt-1 text-xs text-slate-600">O e-mail não pode ser alterado por aqui.</p>
            </div>
            <form onSubmit={saveUsername}>
              <label className="label">Nome de usuário</label>
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={30}
                autoComplete="username"
                required
              />
              <button type="submit" className="btn-primary mt-4" disabled={loading}>
                {loading ? "Salvando..." : "Salvar nome"}
              </button>
            </form>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-7 flex items-center gap-3">
            <span className="profile-section-icon"><ProfileIcon type="key" /></span>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Trocar senha</h2>
              <p className="text-xs text-slate-500">Use uma senha com pelo menos 6 caracteres</p>
            </div>
          </div>

          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="label">Senha atual</label>
              <input type="password" className="input" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
            </div>
            <div>
              <label className="label">Nova senha</label>
              <input type="password" className="input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} autoComplete="new-password" required />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input type="password" className="input" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={6} autoComplete="new-password" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Atualizando..." : "Trocar senha"}
            </button>
          </form>
        </section>
      </div>

      <section className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-bold text-slate-100">Sair da conta</h2>
          <p className="mt-1 text-sm text-slate-500">Você precisará entrar novamente para acessar seu time.</p>
        </div>
        <button type="button" className="btn-danger shrink-0" onClick={handleLogout}>Sair</button>
      </section>
    </div>
  );
}
