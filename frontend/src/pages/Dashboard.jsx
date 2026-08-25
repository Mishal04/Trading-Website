import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { 
  LayoutDashboard, 
  PiggyBank, 
  ArrowUpRight, 
  Users, 
  History, 
  RefreshCw,
  LogOut,
  UserCheck
} from 'lucide-react';

import OverviewTab from '../components/dashboard/OverviewTab';
import InvestTab from '../components/dashboard/InvestTab';
import WithdrawTab from '../components/dashboard/WithdrawTab';
import TeamTab from '../components/dashboard/TeamTab';
import TransactionsTab from '../components/dashboard/TransactionsTab';

export default function Dashboard() {
  const { user, logout, setUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getStats();
      if (res?.data?.data) {
        setStats(res.data.data);
        if (res.data.data.user && setUser) {
          // Keep AuthContext user synced with latest wallet balances
          setUser((prev) => ({ ...prev, ...res.data.data.user, wallet: res.data.data.wallet }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
    { path: '/dashboard/invest', label: 'Invest / Deposit', icon: PiggyBank },
    { path: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpRight },
    { path: '/dashboard/team', label: 'My Team', icon: Users },
    { path: '/dashboard/transactions', label: 'Transactions', icon: History },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-dark-900 text-gray-100">
      {/* Top Secondary Nav Bar */}
      <div className="border-b border-dark-500 bg-dark-800/80 sticky top-16 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto py-2.5 no-scrollbar">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === '/dashboard' || location.pathname === '/dashboard/'
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gold-400 text-dark-900 shadow-md shadow-gold-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/60'
                    }`}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchStats}
                className="p-2 rounded-xl bg-dark-700 text-gray-400 hover:text-white transition-colors"
                title="Refresh stats"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<OverviewTab stats={stats} user={user} onRefresh={fetchStats} />} />
          <Route path="/invest" element={<InvestTab onRefresh={fetchStats} />} />
          <Route path="/withdraw" element={<WithdrawTab user={user} onRefresh={fetchStats} />} />
          <Route path="/team" element={<TeamTab user={user} />} />
          <Route path="/transactions" element={<TransactionsTab />} />
        </Routes>
      </div>
    </div>
  );
}
