import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { beginDiscordRegistrationRequest } from "../../api/auth";
import { getApiErrorMessage } from "../../api/client";
import { ErrorBox } from "../../components/Loading";

export function Register() {
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = new URLSearchParams(location.search).get("discord_error");
    if (message) setError(message);
  }, [location.search]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    try {
      const { authorizationUrl } = await beginDiscordRegistrationRequest({
        username,
        email,
        password,
      });
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Criar conta</h1>
        <p className="mb-6 text-sm text-slate-400">
          Cadastre-se e vincule sua conta do Discord para participar da comunidade Pro Clubs.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Usuario</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={30}
              autoComplete="username"
              autoFocus
              required
            />
            <p className="mt-1 text-xs text-slate-500">Use letras, numeros, ponto, hifen ou underline.</p>
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="label">Confirmar senha</label>
            <input
              type="password"
              className="input"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Abrindo Discord..." : "Vincular Discord e criar conta"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Ja tem uma conta?{" "}
          <Link to="/login" className="font-medium text-accent-400 hover:text-accent-300">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}