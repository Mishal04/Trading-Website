import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';

// Admin
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Investments from './pages/admin/Investments';
import Withdrawals from './pages/admin/Withdrawals';
import Users from './pages/admin/Users';
import ProfitInject from './pages/admin/ProfitInject';

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Route guards ─────────────────────────────────────────────────────────────

/** Authenticated users only — redirects to /login if not logged in. */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

/**
 * Admin-only guard.
 *  - Not logged in  → /login
 *  - Non-admin user → /dashboard
 */
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.accountType !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * Public-only pages (login / register).
 * Admins redirect to /admin; regular users to /dashboard.
 */
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.accountType === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

// ─── Shared public layout (Navbar + Footer) ───────────────────────────────────
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* ── Public / user pages — wrapped in Navbar + Footer ── */}
      <Route element={<PublicLayout />}>
        <Route path="/"                     element={<Landing />} />
        <Route path="/register"             element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/login"                element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/verify-email/:token"  element={<VerifyEmail />} />
        <Route
          path="/dashboard/*"
          element={<PrivateRoute><Dashboard /></PrivateRoute>}
        />
      </Route>

      {/* ── Admin panel — no Navbar/Footer, uses AdminLayout sidebar ── */}
      <Route
        path="/admin"
        element={<AdminRoute><AdminLayout /></AdminRoute>}
      >
        <Route index              element={<AdminDashboard />} />
        <Route path="investments" element={<Investments />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="users"       element={<Users />} />
        <Route path="profit"      element={<ProfitInject />} />
        <Route path="*"           element={<Navigate to="/admin" replace />} />
      </Route>

      {/* ── Global catch-all — must be last ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
