import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';

/**
 * AdminLayout wraps all /admin/* pages.
 * Renders the sticky sidebar + top bar, then <Outlet /> for page content.
 */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-dark-900 text-gray-100">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 bg-dark-800/90 border-b border-dark-500 backdrop-blur-xl">
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-dark-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Page title area — filled by each page via context or just show brand */}
          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gold-400 font-semibold">Admin</span>
            <span>/</span>
            <span>Group Trading Plan</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="font-medium text-white">{user?.name ?? 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
