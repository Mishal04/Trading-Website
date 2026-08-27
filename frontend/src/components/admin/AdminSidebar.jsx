import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PiggyBank,
  ArrowUpRight,
  Users,
  TrendingUp,
  Wallet,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { path: '/admin',           label: 'Dashboard',        icon: LayoutDashboard, exact: true },
  { path: '/admin/investments', label: 'Investments',    icon: PiggyBank },
  { path: '/admin/withdrawals', label: 'Withdrawals',    icon: ArrowUpRight },
  { path: '/admin/users',       label: 'Users',          icon: Users },
  { path: '/admin/profit',      label: 'Profit Inject',  icon: TrendingUp },
];

/**
 * AdminSidebar — fixed left drawer on desktop, slide-over on mobile.
 * Props:
 *   open   (bool)     – mobile open state
 *   onClose (fn)      – close the mobile drawer
 */
export default function AdminSidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-dark-500">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
            <ShieldCheck size={16} className="text-dark-900" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">Admin Panel</div>
            <div className="text-[10px] text-gold-400 mt-0.5">Group Trading Plan</div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gold-400/15 text-gold-400 border border-gold-400/20'
                  : 'text-gray-400 hover:text-white hover:bg-dark-600/60'
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin user + logout */}
      <div className="px-3 py-4 border-t border-dark-500">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-dark-700/50">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400 text-xs font-bold uppercase shrink-0">
            {user?.name?.[0] ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.name ?? 'Admin'}</div>
            <div className="text-[10px] text-gray-500 truncate">{user?.email ?? ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar — always visible ── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 bg-dark-800 border-r border-dark-500 min-h-screen sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay + drawer ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="relative w-64 bg-dark-800 border-r border-dark-500 h-full flex flex-col animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
