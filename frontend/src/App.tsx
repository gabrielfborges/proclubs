import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/public/Dashboard";
import { ChampionshipDetail } from "./pages/public/ChampionshipDetail";
import { Community } from "./pages/public/Community";
import { Login } from "./pages/admin/Login";
import { Register } from "./pages/auth/Register";
import { AuthCallback } from "./pages/auth/AuthCallback";
import { CreateTeam } from "./pages/auth/CreateTeam";
import { EditTeam } from "./pages/auth/EditTeam";
import { Profile } from "./pages/auth/Profile";

import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ChampionshipManage } from "./pages/admin/ChampionshipManage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-base-950">
          <Navbar />
          <main className="app-main"><Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campeonatos/:id" element={<ChampionshipDetail />} />
            <Route path="/comunidade" element={<Community />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/perfil" element={<Profile />} />
              <Route path="/times/criar" element={<CreateTeam />} />
              <Route path="/times" element={<EditTeam />} />
              <Route path="/times/editar/:id" element={<EditTeam />} />

            </Route>

            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/campeonatos/:id" element={<ChampionshipManage />} />
            </Route>

            <Route
              path="*"
              element={
                <div className="mx-auto max-w-2xl px-4 py-24 text-center text-slate-400">
                  Pagina nao encontrada.
                </div>
              }
            />
          </Routes>
        </main></div>
      </AuthProvider>
    </BrowserRouter>
  );
}
