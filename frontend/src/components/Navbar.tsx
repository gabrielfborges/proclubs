import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { beginDiscordLinkRequest } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

type IconName = "home" | "compass" | "edit" | "shield" | "discord" | "users" | "user";

function NavIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      {name === "home" && <><path {...common} d="m3.5 10 8.5-7 8.5 7" /><path {...common} d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" /></>}
      {name === "compass" && <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="m14.9 9.1-1.8 4-4 1.8 1.8-4z" /></>}
      {name === "edit" && <><path {...common} d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3" /><path {...common} d="m13.5 8.5 3 3" /></>}
      {name === "shield" && <><path {...common} d="M12 3.5 19 6v5.2c0 4.2-2.7 7.7-7 9.3-4.3-1.6-7-5.1-7-9.3V6z" /><path {...common} d="m9 12 2 2 4-4" /></>}
      {name === "discord" && <><path {...common} d="M7.5 7.5c3-1.4 6-1.4 9 0 1.2 1.8 1.8 3.8 1.8 6.2-1.8 1.5-3.7 2.3-5.8 2.8l-.7-1.4" /><path {...common} d="M7.5 7.5c-1.2 1.8-1.8 3.8-1.8 6.2 1.8 1.5 3.7 2.3 5.8 2.8" /><circle cx="9.5" cy="12" r=".7" fill="currentColor" /><circle cx="14.5" cy="12" r=".7" fill="currentColor" /></>}
      {name === "users" && <><circle {...common} cx="9" cy="9" r="3" /><path {...common} d="M3.5 19c.5-3 2.4-4.5 5.5-4.5s5 1.5 5.5 4.5M16 6.5a3 3 0 0 1 0 5.8M16.5 14.7c2.2.4 3.5 1.8 4 4.3" /></>}
      {name === "user" && <><circle {...common} cx="12" cy="8" r="3.2" /><path {...common} d="M5 20c.7-3.5 3-5.2 7-5.2s6.3 1.7 7 5.2" /></>}
    </svg>
  );
}

function SidebarLink({ to, label, icon, end = false }: { to: string; label: string; icon: IconName; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
      <NavIcon name={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [discordError, setDiscordError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const linkingDiscordRef = useRef(false);

  useEffect(() => {
    setMobileMenuOpen(false);
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
    <aside className={mobileMenuOpen ? "site-sidebar mobile-menu-open" : "site-sidebar"}>
      <div className="site-brand-wrap">
        <Link to="/" className="site-brand">
          <span className="brand-name">RACHÃO<span>.</span></span>
          <span className="brand-subtitle">TOURNAMENTS</span>
        </Link>
      </div>

      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileMenuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        className="site-nav-links"
        aria-label="Navegação principal"
        onClick={() => setMobileMenuOpen(false)}
      >
        <SidebarLink to="/" label="Hub" icon="home" end />
        <Link to="/" className={`nav-item ${location.pathname === "/" ? "nav-item-muted" : ""}`}>
          <NavIcon name="compass" />
          <span>Descobrir</span>
        </Link>
        <SidebarLink to="/comunidade" label="Comunidade" icon="users" />
        {isAuthenticated && <SidebarLink to="/perfil" label="Meu perfil" icon="user" />}
        {isAuthenticated && <SidebarLink to="/times" label="Meu time" icon="edit" />}
        {isAdmin && <SidebarLink to="/admin" label="Painel Admin" icon="shield" />}
        {isAuthenticated && !user?.discordId && (
          <button onClick={handleLinkDiscord} className="nav-item discord-nav-item" disabled={linkingDiscord}>
            <NavIcon name="discord" />
            <span>{linkingDiscord ? "Abrindo Discord..." : "Vincular Discord"}</span>
          </button>
        )}
      </nav>

      <div className="site-account">
        {discordError && <p className="discord-alert">{discordError}</p>}
        {isAuthenticated ? (
          <div className="account-card">
            <div className="account-avatar">{(user?.username || "U").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{user?.username}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email || "Conta verificada"}</p>
            </div>
            <span className="online-dot" title="Online" />
            <button onClick={handleLogout} className="account-logout" title="Sair">×</button>
          </div>
        ) : (
          <div className="account-actions">
            <Link to="/login" className="btn-secondary w-full !py-2">Entrar</Link>
            <Link to="/register" className="btn-primary w-full !py-2">Criar conta</Link>
          </div>
        )}</div>
    </aside>
  );
}
