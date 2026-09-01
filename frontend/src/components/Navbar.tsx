import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { beginDiscordLinkRequest } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import logoUrl from "../../../img/logo.png";

export function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [discordError, setDiscordError] = useState("");
  const linkingDiscordRef = useRef(false);

  useEffect(() => {
    const message = new URLSearchParams(location.search).get("discord_error");
    if (message) {
      setDiscordError(message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function handleLinkDiscord() {
    if (linkingDiscordRef.current) return;
    linkingDiscordRef.current = true;
    setDiscordError("");
    setLinkingDiscord(true);
    try {
      const { authorizationUrl } = await beginDiscordLinkRequest();
      window.location.assign(authorizationUrl);
    } catch (err) {
      setDiscordError(getApiErrorMessage(err));
      setLinkingDiscord(false);
      linkingDiscordRef.current = false;
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-base-700 bg-base-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3 font-bold text-lg">
          <img
            src={logoUrl}
            alt="FC Pro Clubs Manager"
            className="h-10 w-10 object-contain"
          />
          <span>
            Pro Clubs <span className="text-accent-400">Manager</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `hover:text-accent-400 transition-colors ${isActive ? "text-accent-400" : "text-slate-300"}`
            }
          >
            Campeonatos
          </NavLink>

          {isAuthenticated ? (
            <>


              <NavLink
                to="/times"
                className={({ isActive }) =>
                  `hover:text-accent-400 transition-colors ${isActive ? "text-accent-400" : "text-slate-300"}`
                }
              >
                Editar time
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `hover:text-accent-400 transition-colors ${isActive ? "text-accent-400" : "text-slate-300"}`
                  }
                >
                  Admin
                </NavLink>
              )}
              {!user?.discordId && (
                <button
                  onClick={handleLinkDiscord}
                  className="btn-secondary !py-1.5"
                  disabled={linkingDiscord}
                >
                  {linkingDiscord ? "Abrindo Discord..." : "Vincular Discord"}
                </button>
              )}
              <span className="hidden text-slate-500 sm:inline">{user?.username}</span>
              <button onClick={handleLogout} className="btn-secondary !py-1.5">
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary !py-1.5">
                Entrar
              </Link>
              <Link to="/register" className="btn-primary !py-1.5">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
      {discordError && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs text-red-300">
          {discordError}
        </div>
      )}
    </header>
  );
}
