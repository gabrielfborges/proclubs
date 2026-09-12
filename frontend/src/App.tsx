import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Loading } from "./components/Loading";

const Dashboard = lazy(() =>
  import("./pages/public/Dashboard").then(({ Dashboard }) => ({ default: Dashboard }))
);
const Championships = lazy(() =>
  import("./pages/public/Championships").then(({ Championships }) => ({ default: Championships }))
);
const ChampionshipDetail = lazy(() =>
  import("./pages/public/ChampionshipDetail").then(({ ChampionshipDetail }) => ({ default: ChampionshipDetail }))
);
const Community = lazy(() =>
  import("./pages/public/Community").then(({ Community }) => ({ default: Community }))
);
const Login = lazy(() =>
  import("./pages/admin/Login").then(({ Login }) => ({ default: Login }))
);
const Register = lazy(() =>
  import("./pages/auth/Register").then(({ Register }) => ({ default: Register }))
);
const AuthCallback = lazy(() =>
  import("./pages/auth/AuthCallback").then(({ AuthCallback }) => ({ default: AuthCallback }))
);
const CreateTeam = lazy(() =>
  import("./pages/auth/CreateTeam").then(({ CreateTeam }) => ({ default: CreateTeam }))
);
const EditTeam = lazy(() =>
  import("./pages/auth/EditTeam").then(({ EditTeam }) => ({ default: EditTeam }))
);
const Profile = lazy(() =>
  import("./pages/auth/Profile").then(({ Profile }) => ({ default: Profile }))
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then(({ AdminDashboard }) => ({ default: AdminDashboard }))
);
const ChampionshipManage = lazy(() =>
  import("./pages/admin/ChampionshipManage").then(({ ChampionshipManage }) => ({ default: ChampionshipManage }))
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-base-950">
          <Navbar />
          <main className="app-main">
            <Suspense fallback={<Loading label="Carregando página..." />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/campeonatos" element={<Championships />} />
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
            </Suspense>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
