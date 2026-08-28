import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../api/client";
import { ErrorBox } from "../../components/Loading";

interface LoginLocationState {
  from?: { pathname?: string };
  registered?: boolean;
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LoginLocationState | null) ?? null;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(identifier, password);
      const redirectTo = user.role === "ADMIN" ? state?.from?.pathname || "/admin" : "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Entrar</h1>
        <p className="mb-6 text-sm text-slate-400">
          Entre na sua conta para continuar.
        </p>

        {state?.registered && (
          <div className="mb-4 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-400">
            Conta criada com sucesso. Agora entre para acessar o sistema.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Usuario ou email</label>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
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
              autoComplete="current-password"
              required
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Ainda nao tem uma conta?{" "}
          <Link to="/register" className="font-medium text-accent-400 hover:text-accent-300">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}