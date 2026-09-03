import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../../api/auth";
import { getApiErrorMessage } from "../../api/client";
import { ErrorBox } from "../../components/Loading";

export function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    try {
      await registerRequest({ username, email, password });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Criar conta</h1>
        <p className="mb-6 text-sm text-slate-400">
          Cadastre-se para participar da comunidade Pro Clubs. Você poderá vincular o Discord depois.
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
              minLength={8}
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
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
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