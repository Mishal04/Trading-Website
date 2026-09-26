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
  UserCheck,
  Lock,
  TrendingUp
} from 'lucide-react';

import OverviewTab from '../components/dashboard/OverviewTab';
import InvestTab from '../components/dashboard/InvestTab';
import WithdrawTab from '../components/dashboard/WithdrawTab';
// import TransferTab from '../components/dashboard/TransferTab'; // P2P hidden from UI
import TeamTab from '../components/dashboard/TeamTab';
import TransactionsTab from '../components/dashboard/TransactionsTab';
import NetworkerLocked from '../components/dashboard/NetworkerLocked';

// ─── Helper: check if user has networker access ────────────────────────────────
const hasNetworkerAccess = (user) => {
  return Boolean(user && user.networkerAccessGranted === true);
};

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
    { path: '/dashboard/transactions', label: 'Transactions', icon: History },
  ];

  const networkerItems = [
    { path: '/dashboard/team', label: 'My Team', icon: Users },
    { path: '/dashboard/commissions', label: 'Commissions', icon: TrendingUp },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-dark-900 text-gray-100">
      {/* Top Secondary Nav Bar */}
      <div className="border-b border-dark-500 bg-dark-800/80 sticky top-16 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto py-2.5 no-scrollbar">
            <div className="flex items-center gap-6">
              {/* Investor Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Investor</span>
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
              </div>

              {/* Divider */}
              <div className="h-12 w-px bg-dark-600" />

              {/* Networker Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Networker</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {networkerItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const isLocked = !hasNetworkerAccess(user);

                    if (isLocked) {
                      return (
                        <button
                          key={item.path}
                          disabled
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-gray-500 opacity-50 cursor-not-allowed"
                          title="Networker section locked. Contact admin to enable."
                        >
                          <Lock size={15} />
                          {item.label}
                        </button>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
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
              </div>
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
          {/* <Route path="/transfer" element={<TransferTab user={user} onRefresh={fetchStats} />} /> */}{/* P2P hidden from UI */}
          <Route path="/transactions" element={<TransactionsTab />} />
          
          {/* Networker Section — guarded by lock */}
          <Route 
            path="/team" 
            element={
              hasNetworkerAccess(user) 
                ? <TeamTab user={user} />
                : <NetworkerLocked />
            } 
          />
          <Route 
            path="/commissions" 
            element={
              hasNetworkerAccess(user) 
                ? <TransactionsTab filterType="commission" />
                : <NetworkerLocked />
            } 
          />
        </Routes>
      </div>
    </div>
  );
}
