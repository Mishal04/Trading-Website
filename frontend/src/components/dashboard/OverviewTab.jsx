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
  const referralUrl = `${window.location.origin}/register?ref=${referralCode}`;
  const investments = stats?.investments || { totalInvested: 0, activeCount: 0, totalProfitEarned: 0 };
  const team = stats?.team || { directCount: 0, unlockedLevels: 0, teamBusiness: { total: 0 } };
  const recentTransactions = stats?.recentTransactions || [];

  const role = stats?.user?.role || user?.role || 'investor';
  const isWorkingLeader = role === 'working_leader';
  const isNetworker = stats?.user?.networkerAccessGranted ?? user?.networkerAccessGranted ?? false;
  const capMultiple = stats?.incomeCap?.capMultiple ?? 5;
  const totalInvested = stats?.user?.totalInvested ?? stats?.incomeCap?.totalInvested ?? investments.totalInvested ?? 0;
  const totalEarned = stats?.user?.totalEarned ?? stats?.incomeCap?.totalEarned ?? 0;
  const capAmount = stats?.incomeCap?.capAmount ?? (totalInvested * capMultiple);
  const capProgressPercent = stats?.incomeCap?.progressPercent ?? (capAmount > 0 ? Math.min(100, Math.round((totalEarned / capAmount) * 100)) : 0);
  const capRemaining = stats?.incomeCap?.remaining ?? Math.max(0, capAmount - totalEarned);
  const isCapReached = capAmount > 0 && totalEarned >= capAmount;

  const directCount = stats?.user?.directCount ?? stats?.team?.directCount ?? user?.directCount ?? 0;
  const unlockedLevels = stats?.user?.unlockedLevels ?? stats?.team?.unlockedLevels ?? user?.unlockedLevels ?? 0;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Referral link copied!');
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
              <ShieldCheck size={14} /> {isWorkingLeader ? 'Working Leader (3X Cap)' : isNetworker ? 'Networker Account (3X Cap)' : 'Investor Account (3X Cap)'}
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

      {/* Income Cap & Level Progress Banner */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Income Cap Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-gold-400">
                  Income Cap ({capMultiple}X {isWorkingLeader ? 'Working Leader' : isNetworker ? 'Networker' : 'Investor'})
                </span>
                {isCapReached && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                    Cap Reached
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-gray-400">
                ${Number(totalEarned).toFixed(2)} / ${Number(capAmount).toFixed(2)} USDT
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-dark-900 rounded-full h-3.5 p-0.5 border border-dark-600 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCapReached
                    ? 'bg-red-500'
                    : capProgressPercent > 80
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400'
                    : 'bg-gradient-to-r from-gold-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(capProgressPercent, capAmount > 0 ? 3 : 0))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-400">
              <span>{capProgressPercent}% Capped</span>
              <span>
                {isCapReached ? (
                  <strong className="text-red-400">Reinvest to continue earning</strong>
                ) : (
                  <span>Remaining headroom: <strong className="text-white">${Number(capRemaining).toFixed(2)} USDT</strong></span>
                )}
              </span>
            </div>
          </div>

          {/* Level Unlocking & Directs Metric */}
          <div className="flex sm:items-center gap-4 border-t lg:border-t-0 lg:border-l border-dark-600 pt-4 lg:pt-0 lg:pl-6 shrink-0">
            <div className="p-3 rounded-xl bg-dark-900 border border-dark-600 text-center min-w-[110px]">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Direct Referrals</span>
              <span className="text-2xl font-black text-white">{directCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-600 text-center min-w-[125px]">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Unlocked Levels</span>
              <span className="text-2xl font-black text-gold-400">
                {unlockedLevels}<span className="text-xs text-gray-500 font-normal"> / 21</span>
              </span>
            </div>
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

      {/* Referral Banner - Only show if user has active investments */}
      {investments.activeCount > 0 ? (
        <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-gold-400" /> Share Your Referral Link
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Earn 21-level team commissions when friends sign up and trade with your link.
              </p>
              <div className="text-xs text-gray-400 mt-1">
                Code: <span className="text-gold-400 font-mono font-bold">{referralCode}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 max-w-lg w-full md:w-auto">
              <input
                readOnly
                value={referralUrl}
                className="flex-1 bg-dark-900/90 rounded-xl px-4 py-2.5 text-xs text-gold-400 border border-dark-500 font-mono focus:outline-none"
              />
              <button
                onClick={copyReferral}
                className="px-5 py-2.5 rounded-xl bg-gold-400 text-dark-900 font-bold text-xs flex items-center gap-1.5 hover:bg-gold-300 transition-colors shrink-0 shadow-md shadow-gold-500/10"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-amber-400" /> Unlock Referral Sharing
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Create your first active investment to unlock your referral link and start earning team commissions.
              </p>
            </div>
            <Link
              to="/dashboard/invest"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-gold-500/20 shrink-0"
            >
              <PiggyBank size={16} /> Create First Investment
            </Link>
          </div>
        </div>
      )}

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
                <span className="text-sm font-bold text-white">{directCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Unlocked Generations</span>
                <span className="text-sm font-bold text-gold-400">{unlockedLevels} / 21</span>
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
