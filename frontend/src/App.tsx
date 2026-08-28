import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/public/Dashboard";
import { ChampionshipDetail } from "./pages/public/ChampionshipDetail";
import { Login } from "./pages/admin/Login";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ChampionshipManage } from "./pages/admin/ChampionshipManage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-base-950">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campeonatos/:id" element={<ChampionshipDetail />} />
            <Route path="/admin/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
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
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
