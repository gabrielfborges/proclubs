import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ErrorBox, Loading } from "../../components/Loading";

export function AuthCallback() {
  const { completeLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("auth_token");
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!token) {
      setError("Nao foi possivel concluir a vinculacao com o Discord.");
      return;
    }

    completeLogin(token)
      .then(() => navigate("/", { replace: true }))
      .catch(() => {
        localStorage.removeItem("fc_auth_token");
        localStorage.removeItem("fc_user");
        setError("Nao foi possivel concluir o login. Tente novamente.");
      });
  }, [completeLogin, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <ErrorBox message={error} />
      </div>
    );
  }

  return <Loading label="Concluindo vinculacao com o Discord..." />;
}
