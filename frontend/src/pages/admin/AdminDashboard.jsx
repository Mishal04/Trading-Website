import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  Users, PiggyBank, ArrowUpRight, TrendingUp,
  Wallet, RefreshCw, AlertCircle, ChevronRight,
  Clock, CheckCircle2, DollarSign,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const num = (n = 0) => new Intl.NumberFormat('en-US').format(n);

function StatCard({ icon: Icon, label, value, sub, accent, to }) {
  const card = (
    <div className={`rounded-2xl border bg-dark-800/60 p-5 flex items-start gap-4 card-hover transition-all ${accent ? 'border-gold-400/30' : 'border-dark-500'}`}>
      <div className={`p-2.5 rounded-xl shrink-0 ${accent ? 'bg-gold-400/15' : 'bg-dark-700'}`}>
        <Icon size={20} className={accent ? 'text-gold-400' : 'text-gray-400'} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="text-xl font-bold text-white truncate">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
      {to && <ChevronRight size={16} className="text-gray-600 ml-auto shrink-0 mt-1" />}
    </div>
  );
  return to ? <Link to={to} className="block">{card}</Link> : card;
}

function PoolBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className={`font-semibold ${color}`}>{fmt(value)}</span>
      </div>
      <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getStats();
      setStats(res.data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-48 bg-dark-700 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-dark-800 rounded-2xl border border-dark-500" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-gray-400">{error}</p>
        <button onClick={fetchStats} className="px-5 py-2.5 rounded-xl bg-gold-400 text-dark-900 font-semibold text-sm hover:bg-gold-300 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const pools = stats?.systemPools ?? {};
  const poolTotal = (pools.investorPool ?? 0) + (pools.levelPool ?? 0) + (pools.salaryPool ?? 0) + (pools.rewardPool ?? 0) + (pools.traderSharePool ?? 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">System-wide overview</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Primary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Users"           value={num(stats?.totalUsers)}                 sub={`${num(stats?.activeUsers)} active investors`} accent />
        <StatCard icon={PiggyBank}   label="Active Investments"    value={num(stats?.activeInvestmentsCount)}     sub={fmt(stats?.totalInvestmentVolume) + ' capital'} to="/admin/investments?status=active" />
        <StatCard icon={Clock}       label="Pending Investments"   value={num(stats?.pendingInvestmentsCount)}    sub="Awaiting approval" accent={stats?.pendingInvestmentsCount > 0} to="/admin/investments?status=pending" />
        <StatCard icon={ArrowUpRight} label="Pending Withdrawals"  value={num(stats?.pendingWithdrawalsCount)}    sub="Awaiting action"   accent={stats?.pendingWithdrawalsCount > 0} to="/admin/withdrawals?status=pending" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}  label="Total Capital (Active)" value={fmt(stats?.totalInvestmentVolume)}   sub="Active investments only" />
        <StatCard icon={TrendingUp}  label="Profit Distributed"     value={fmt(stats?.totalProfitDistributed)}  sub="All time" />
        <StatCard icon={Wallet}      label="Commission Distributed"  value={fmt(stats?.totalCommissionDistributed)} sub="All time" />
        <StatCard icon={CheckCircle2} label="Total Realized Profit" value={fmt(pools?.totalRealizedProfit)}     sub="Injected into pools" />
      </div>

      {/* ── System Pools ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">System Pool Balances</h2>
            <Link to="/admin/profit" className="text-xs text-gold-400 hover:underline flex items-center gap-1">
              Inject Profit <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-4">
            <PoolBar label="Investor Pool (60%)"       value={pools.investorPool   ?? 0} total={poolTotal} color="text-gold-400" />
            <PoolBar label="Level Commission (10%)"    value={pools.levelPool      ?? 0} total={poolTotal} color="text-blue-400" />
            <PoolBar label="Leadership Salary (6%)"    value={pools.salaryPool     ?? 0} total={poolTotal} color="text-emerald-400" />
            <PoolBar label="Performance Reward (4%)"   value={pools.rewardPool     ?? 0} total={poolTotal} color="text-purple-400" />
            <PoolBar label="Trader Share (20%)"        value={pools.traderSharePool?? 0} total={poolTotal} color="text-orange-400" />
          </div>
          <div className="mt-5 pt-4 border-t border-dark-600 flex justify-between text-xs text-gray-500">
            <span>Total in pools</span>
            <span className="font-semibold text-white">{fmt(poolTotal)}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <h2 className="font-semibold text-white mb-5">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { to: '/admin/investments?status=pending', label: 'Review Pending Investments', badge: stats?.pendingInvestmentsCount, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
              { to: '/admin/withdrawals?status=pending', label: 'Process Pending Withdrawals', badge: stats?.pendingWithdrawalsCount, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
              { to: '/admin/profit',   label: 'Inject Realized Profit',      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
              { to: '/admin/users',    label: 'Manage Users',                color: 'text-gray-300 bg-dark-700 border-dark-500' },
            ].map(({ to, label, badge, color }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:opacity-90 ${color}`}
              >
                <span>{label}</span>
                <div className="flex items-center gap-2">
                  {badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                  <ChevronRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
