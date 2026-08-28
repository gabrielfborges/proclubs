import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoUrl from "../../../img/logo.png";

export function Navbar() {
  const { isAuthenticated, admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
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
                to="/admin"
                className={({ isActive }) =>
                  `hover:text-accent-400 transition-colors ${isActive ? "text-accent-400" : "text-slate-300"}`
                }
              >
                Admin
              </NavLink>
              <span className="hidden text-slate-500 sm:inline">{admin?.username}</span>
              <button onClick={handleLogout} className="btn-secondary !py-1.5">
                Sair
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="btn-secondary !py-1.5">
              Login admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
