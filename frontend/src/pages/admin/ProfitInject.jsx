import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, RefreshCw, AlertCircle, CheckCircle2,
  DollarSign, Wallet,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Preview breakdown of how a gross amount splits across pools. */
function Breakdown({ gross }) {
  if (!gross || gross <= 0) return null;
  const g = Number(gross);
  const rows = [
    { label: 'Investor Share (60%)',        pct: 0.60, color: 'text-gold-400' },
    { label: 'Level Commission (10%)',       pct: 0.10, color: 'text-blue-400' },
    { label: 'Leadership Salary (6%)',       pct: 0.06, color: 'text-emerald-400' },
    { label: 'Performance Reward (4%)',      pct: 0.04, color: 'text-purple-400' },
    { label: 'Trader Share (20%)',           pct: 0.20, color: 'text-orange-400' },
  ];
  return (
    <div className="mt-5 rounded-xl border border-dark-500 bg-dark-700/40 p-4 space-y-2.5">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Preview breakdown</p>
      {rows.map(({ label, pct, color }) => (
        <div key={label} className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{label}</span>
          <span className={`font-semibold tabular-nums ${color}`}>{fmt(g * pct)}</span>
        </div>
      ))}
      <div className="border-t border-dark-500 pt-2.5 flex justify-between text-sm font-bold">
        <span className="text-white">Total</span>
        <span className="text-gold-400">{fmt(g)}</span>
      </div>
    </div>
  );
}

/** Single pool balance card. */
function PoolCard({ label, value, color, pct }) {
  return (
    <div className="rounded-xl border border-dark-500 bg-dark-800/60 p-4">
      <div className="text-xs text-gray-500 mb-1.5">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{fmt(value)}</div>
      {pct !== undefined && (
        <div className="mt-2 h-1 bg-dark-600 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ProfitInject() {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);   // last injection response

  const [pools, setPools]     = useState(null);
  const [poolsLoading, setPoolsLoading] = useState(true);

  const fetchPools = useCallback(async () => {
    setPoolsLoading(true);
    try {
      const res = await adminAPI.getPools();
      setPools(res.data?.data?.pool ?? null);
    } catch {
      // non-critical — pools section just won't show
    } finally {
      setPoolsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPools(); }, [fetchPools]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error('Enter a valid amount greater than $0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminAPI.injectProfit(val, note.trim() || undefined);
      const data = res.data?.data;
      setLastResult(data);
      setPools(data?.currentSystemPools ?? pools);
      toast.success(`$${val.toLocaleString()} injected successfully`);
      setAmount('');
      setNote('');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Injection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const poolTotal = pools
    ? (pools.investorPool ?? 0) + (pools.levelPool ?? 0) + (pools.salaryPool ?? 0)
      + (pools.rewardPool ?? 0) + (pools.traderSharePool ?? 0)
    : 1;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-gold-400" size={24} />
          Profit Injection
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Distribute realized trading profit into system pools
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── Injection form ── */}
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <DollarSign className="text-gold-400" size={18} />
            Inject Realized Profit
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Gross Realized Profit (USD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Weekly profit distribution — Week 32"
                className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
              />
            </div>

            {/* Live breakdown preview */}
            <Breakdown gross={amount} />

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !amount}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-bold text-sm hover:from-gold-400 hover:to-gold-300 transition-all gold-glow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Injecting…' : 'Inject into Pools'}
            </button>
          </form>

          {/* Last injection result */}
          {lastResult && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-3">
                <CheckCircle2 size={16} />
                Last Injection — {fmt(lastResult.grossProfit)}
              </div>
              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex justify-between"><span>Investor (60%)</span><span className="text-gold-400 font-medium">{fmt(lastResult.breakdown?.investorShare60)}</span></div>
                <div className="flex justify-between"><span>Level Pool (10%)</span><span className="text-blue-400 font-medium">{fmt(lastResult.breakdown?.levelPool10)}</span></div>
                <div className="flex justify-between"><span>Salary (6%)</span><span className="text-emerald-400 font-medium">{fmt(lastResult.breakdown?.salaryPool6)}</span></div>
                <div className="flex justify-between"><span>Reward (4%)</span><span className="text-purple-400 font-medium">{fmt(lastResult.breakdown?.rewardPool4)}</span></div>
                <div className="flex justify-between"><span>Trader (20%)</span><span className="text-orange-400 font-medium">{fmt(lastResult.breakdown?.traderShare20)}</span></div>
              </div>
              {/* Investor distribution summary */}
              {lastResult.investorDistribution && (
                <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-1.5 text-xs">
                  <div className="text-emerald-300 font-semibold mb-1.5">Investor Distribution</div>
                  <div className="flex justify-between text-gray-400"><span>Total distributed</span><span className="text-emerald-400 font-medium">{fmt(lastResult.investorDistribution.totalDistributed)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Investors credited</span><span className="text-white font-medium">{lastResult.investorDistribution.userCount}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Skipped (inactive)</span><span className="text-gray-500">{lastResult.investorDistribution.skippedCount}</span></div>
                  {/* Per-user breakdown if ≤50 investors */}
                  {lastResult.investorDistribution.perUser?.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1 pr-1">
                      {lastResult.investorDistribution.perUser.map((u) => (
                        <div key={u.userId} className="flex justify-between text-gray-500">
                          <span className="truncate max-w-[120px]">{u.name}</span>
                          <span className="text-emerald-400 font-medium tabular-nums">{fmt(u.share)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Live Pool Balances ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Wallet className="text-gold-400" size={18} />
              Current Pool Balances
            </h2>
            <button onClick={fetchPools} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              <RefreshCw size={12} className={poolsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {poolsLoading ? (
            <div className="grid grid-cols-2 gap-3 animate-pulse">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-20 bg-dark-800 rounded-xl border border-dark-500" />
              ))}
            </div>
          ) : pools ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <PoolCard label="Investor Pool (60%)"      value={pools.investorPool    ?? 0} color="text-gold-400"    pct={((pools.investorPool ?? 0) / poolTotal) * 100} />
                <PoolCard label="Level Commission (10%)"   value={pools.levelPool       ?? 0} color="text-blue-400"    pct={((pools.levelPool    ?? 0) / poolTotal) * 100} />
                <PoolCard label="Salary Pool (6%)"         value={pools.salaryPool      ?? 0} color="text-emerald-400" pct={((pools.salaryPool   ?? 0) / poolTotal) * 100} />
                <PoolCard label="Reward Pool (4%)"         value={pools.rewardPool      ?? 0} color="text-purple-400"  pct={((pools.rewardPool   ?? 0) / poolTotal) * 100} />
                <PoolCard label="Trader Share (20%)"       value={pools.traderSharePool ?? 0} color="text-orange-400"  pct={((pools.traderSharePool ?? 0) / poolTotal) * 100} />
                <PoolCard label="Total Realized Profit"    value={pools.totalRealizedProfit ?? 0} color="text-white" />
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Last updated: {fmtDate(pools.lastUpdated)}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
              <AlertCircle size={14} /> Could not load pool balances.
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-5 text-sm text-gray-400 leading-relaxed max-w-3xl">
        <p className="font-semibold text-gold-400 mb-1.5">How profit injection works</p>
        <p>
          Enter the total gross trading profit realized. The system automatically splits it:
          <strong className="text-white"> 60%</strong> investor pool ·
          <strong className="text-white"> 10%</strong> level commissions ·
          <strong className="text-white"> 6%</strong> leadership salary ·
          <strong className="text-white"> 4%</strong> performance reward ·
          <strong className="text-white"> 20%</strong> trader share.
          Each injection is logged as an audit transaction.
          Pool distributions (salary, rewards) run via the monthly cron jobs.
        </p>
      </div>
    </div>
  );
}
