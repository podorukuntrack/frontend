import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/ui';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ClustersPage from './pages/clusters/ClustersPage';
import UnitsPage from './pages/units/UnitsPage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import ProgressPage from './pages/progress/ProgressPage';
import DocumentationPage from './pages/documentation/DocumentationPage';
import UsersPage from './pages/users/UsersPage';
import CompaniesPage from './pages/companies/CompaniesPage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'customer' ? '/units' : '/'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute roles={['super_admin','admin']}><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
      <Route path="/companies" element={<PrivateRoute roles={['super_admin']}><AppLayout><CompaniesPage /></AppLayout></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute roles={['super_admin','admin']}><AppLayout><ProjectsPage /></AppLayout></PrivateRoute>} />
      <Route path="/clusters" element={<PrivateRoute roles={['super_admin','admin']}><AppLayout><ClustersPage /></AppLayout></PrivateRoute>} />
      <Route path="/units" element={<PrivateRoute><AppLayout><UnitsPage /></AppLayout></PrivateRoute>} />
      <Route path="/assignments" element={<PrivateRoute><AppLayout><AssignmentsPage /></AppLayout></PrivateRoute>} />
      <Route path="/progress" element={<PrivateRoute><AppLayout><ProgressPage /></AppLayout></PrivateRoute>} />
      <Route path="/documentation" element={<PrivateRoute><AppLayout><DocumentationPage /></AppLayout></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute roles={['super_admin','admin']}><AppLayout><UsersPage /></AppLayout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
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
