import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react"; // ✅ tambah useEffect
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastContainer } from "./components/ui";
import AppLayout from "./components/layout/AppLayout";
import { navigateRef } from "./api/client"; // ✅ tambah import ini

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import UsersPage from "./pages/users/UsersPage";
import CompaniesPage from "./pages/companies/CompaniesPage";

// Halaman Error & Proteksi
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";

import ServerErrorPage from "./pages/ServerErrorPage"; // ✅ tambah import ini

function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRef.current = navigate; // ✅ pakai useEffect agar tidak re-assign tiap render
  }, [navigate]);
  return null;
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  // Jika role user tidak ada di dalam array roles yang diizinkan
  if (roles && !roles.includes(user.role))
    return <Navigate to="/unauthorized" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.role === "customer") {
      // Jika nanti customer punya dashboard sendiri, ganti path ini (misal: to="/my-units")
      return <Navigate to="/unauthorized" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}

// Helper to darken hex colors for hover effects
const darkenHex = (hex, percent) => {
  try {
    let num = parseInt(hex.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
  } catch {
    return hex;
  }
};

function AppRoutes() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.company?.themeColor) {
      const hex = user.company.themeColor;
      const hoverHex = darkenHex(hex, 10);
      document.documentElement.style.setProperty('--color-primary', hex);
      document.documentElement.style.setProperty('--color-primary-hover', hoverHex);
      document.documentElement.style.setProperty('--color-primary-light', `${hex}15`);
      document.documentElement.style.setProperty('--color-primary-border', `${hex}25`);
    } else {
      // Default brand: Crimson Red (#B51318)
      document.documentElement.style.setProperty('--color-primary', '#B51318');
      document.documentElement.style.setProperty('--color-primary-hover', '#9c0e12');
      document.documentElement.style.setProperty('--color-primary-light', '#B5131815');
      document.documentElement.style.setProperty('--color-primary-border', '#B5131825');
    }
  }, [user]);

  return (
    <Routes>
      <Route path="/*" element={<NavigateSetter />} /> {/* ✅ tambahkan ini */}
      {/* Rute Publik */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      {/* Rute Terproteksi (Admin & Super Admin) */}
      <Route
        path="/"
        element={
          <PrivateRoute roles={["super_admin", "admin"]}>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <PrivateRoute roles={["super_admin"]}>
            <AppLayout>
              <CompaniesPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/*"
        element={
          <PrivateRoute roles={["super_admin", "admin"]}>
            <AppLayout>
              <ProjectsPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute roles={["super_admin", "admin"]}>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      {/* Rute Error */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/server-error" element={<ServerErrorPage />} />{" "}
      {/* ✅ tambah ini */}
      {/* 404 Wildcard (Harus diletakkan paling bawah) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
