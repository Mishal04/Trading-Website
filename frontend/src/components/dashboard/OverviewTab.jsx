import { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  Copy, 
  Check, 
  ArrowUpRight, 
  PiggyBank, 
  Award,
  ShieldCheck,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function OverviewTab({ stats, user, onRefresh }) {
  const [copied, setCopied] = useState(false);

  const wallet = stats?.wallet || user?.wallet || { capital: 0, profit: 0, commission: 0, totalBalance: 0 };
  const referralCode = user?.referralCode || stats?.user?.referralCode || '--------';
  const investments = stats?.investments || { totalInvested: 0, activeCount: 0, totalProfitEarned: 0 };
  const team = stats?.team || { directCount: 0, teamBusiness: { total: 0 } };
  const recentTransactions = stats?.recentTransactions || [];

  const copyReferral = () => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-400 text-xs font-semibold mb-2">
              <ShieldCheck size={14} /> Active Account ({user?.accountType || 'user'})
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, <span className="gradient-text">{user?.name || user?.fullName || 'Trader'}</span>!
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Your financial portfolio overview & real-time trading stats.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/invest"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-bold text-sm flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-gold-500/20"
            >
              <PiggyBank size={16} /> New Investment
            </Link>
            <Link
              to="/dashboard/withdraw"
              className="px-4 py-2.5 rounded-xl bg-dark-600 border border-dark-500 text-white font-semibold text-sm flex items-center gap-2 hover:bg-dark-500 transition-colors"
            >
              Withdraw <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-blue-500/20 bg-dark-800/80 p-6 backdrop-blur-xl relative group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-400">Capital Balance</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${Number(wallet.capital || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-500 mt-2">Active invested capital</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-dark-800/80 p-6 backdrop-blur-xl relative group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-400">Profit Balance</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            ${Number(wallet.profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-500 mt-2">Withdrawable daily returns</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-dark-800/80 p-6 backdrop-blur-xl relative group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-400">Commission Wallet</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Award size={20} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-400">
            ${Number(wallet.commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-500 mt-2">Team level & bonus earnings</p>
        </div>
      </div>

      {/* Referral Banner */}
      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-gold-400" /> Share Your Referral Link
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Earn 25-level team commissions when friends sign up and trade with your code: <span className="text-gold-400 font-mono font-bold">{referralCode}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-lg w-full md:w-auto">
            <input
              readOnly
              value={`${window.location.origin}/register?ref=${referralCode}`}
              className="flex-1 bg-dark-900/90 rounded-xl px-4 py-2.5 text-xs text-gray-300 border border-dark-500 font-mono truncate focus:outline-none"
            />
            <button
              onClick={copyReferral}
              className="px-5 py-2.5 rounded-xl bg-gold-400 text-dark-900 font-bold text-xs flex items-center gap-1.5 hover:bg-gold-300 transition-colors shrink-0 shadow-md shadow-gold-500/10"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio & Quick Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Clock size={18} className="text-gold-400" /> Recent Activity
            </h3>
            <Link to="/dashboard/transactions" className="text-xs text-gold-400 hover:underline flex items-center gap-1">
              View All <ArrowUpRight size={12} />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-dark-500 rounded-xl">
              <p className="text-gray-400 text-sm">No recent transactions found.</p>
              <Link to="/dashboard/invest" className="text-xs text-gold-400 mt-2 inline-block hover:underline">
                Create your first investment package →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-dark-500/50">
              {recentTransactions.map((tx) => (
                <div key={tx._id || tx.id} className="py-3.5 flex items-center justify-between hover:bg-dark-700/30 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                      tx.type === 'investment' ? 'bg-blue-500/10 text-blue-400' :
                      tx.type === 'profit' ? 'bg-emerald-500/10 text-emerald-400' :
                      tx.type === 'commission' ? 'bg-purple-500/10 text-purple-400' :
                      tx.type === 'withdrawal' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {tx.type === 'investment' ? 'INV' :
                       tx.type === 'profit' ? 'RET' :
                       tx.type === 'commission' ? 'COM' :
                       tx.type === 'withdrawal' ? 'WTH' : 'ADJ'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white capitalize">{tx.description || tx.type}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(tx.date || tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      tx.type === 'withdrawal' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${Number(tx.amount || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium capitalize">
                      {tx.status || 'completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Investment Metrics</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Invested</span>
                <span className="text-sm font-bold text-white">${Number(investments.totalInvested || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Active Packages</span>
                <span className="text-sm font-bold text-gold-400">{investments.activeCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Profit Earned</span>
                <span className="text-sm font-bold text-emerald-400">${Number(investments.totalProfitEarned || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Network Metrics</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Direct Referrals</span>
                <span className="text-sm font-bold text-white">{team.directCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Team Business Volume</span>
                <span className="text-sm font-bold text-purple-400">${Number(team.teamBusiness?.total || 0).toLocaleString()}</span>
              </div>
            </div>
            <Link
              to="/dashboard/team"
              className="mt-4 w-full py-2 rounded-xl bg-dark-700 border border-dark-500 text-xs font-medium text-gray-300 hover:text-gold-400 hover:border-gold-400 flex items-center justify-center gap-1 transition-colors"
            >
              View Downline Tree <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
