import { useState, useEffect } from 'react';
import { investmentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PiggyBank, Sparkles, CheckCircle2, TrendingUp, DollarSign, RefreshCw, Layers } from 'lucide-react';

const PACKAGES = [
  {
    id: 1,
    name: 'Tier 1 Package',
    range: '$100 – $500',
    rate: '0.35% – 0.50% Daily',
    min: 100,
    max: 500,
    color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
    badge: 'Starter',
  },
  {
    id: 2,
    name: 'Tier 2 Package',
    range: '$1,000 – $5,000',
    rate: '1.00% – 1.25% Daily',
    min: 1000,
    max: 5000,
    color: 'from-gold-500/20 to-gold-600/5 border-gold-500/40 text-gold-400',
    badge: 'Popular',
    featured: true,
  },
  {
    id: 3,
    name: 'Tier 3 Package',
    range: '$7,500+',
    rate: '1.50% – 2.00% Daily',
    min: 7500,
    max: 100000,
    color: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    badge: 'VIP Elite',
  },
];

export default function InvestTab({ onRefresh }) {
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [myInvestments, setMyInvestments] = useState([]);
  const [fetching, setFetching] = useState(true);

  const fetchInvestments = async () => {
    try {
      setFetching(true);
      const res = await investmentAPI.getMy();
      setMyInvestments(res.data.data.investments || []);
    } catch (err) {
      console.error('Failed to load investments:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const numAmount = parseFloat(amount) || 0;

  // Calculate tier & rate preview
  const getPackagePreview = (val) => {
    if (val >= 7500) {
      const rate = Math.min(2.00, 1.50 + ((val - 7500) / 10000) * (2.00 - 1.50));
      return { tier: 3, name: 'Tier 3 VIP', ratePercent: rate };
    }
    if (val >= 1000) {
      const rate = 1.00 + ((val - 1000) / 4000) * (1.25 - 1.00);
      return { tier: 2, name: 'Tier 2 Standard', ratePercent: rate };
    }
    const rate = 0.35 + ((val - 100) / 400) * (0.50 - 0.35);
    return { tier: 1, name: 'Tier 1 Basic', ratePercent: Math.max(0.35, rate) };
  };

  const preview = getPackagePreview(numAmount);
  const estimatedDaily = (numAmount * preview.ratePercent) / 100;
  const estimatedMonthly = estimatedDaily * 30;

  const handleInvest = async (e) => {
    e.preventDefault();
    if (numAmount < 100) {
      toast.error('Minimum investment amount is $100');
      return;
    }

    try {
      setLoading(true);
      const res = await investmentAPI.create(numAmount);
      toast.success(res.data.message || 'Investment created successfully!');
      fetchInvestments();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create investment';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <PiggyBank className="text-gold-400" /> Choose Investment Package
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Select a tier or enter your custom amount to activate daily algorithmic trading returns.
        </p>
      </div>

      {/* Package Tier Display Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => {
          const isSelected = preview.tier === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => setAmount(pkg.min.toString())}
              className={`rounded-2xl border p-6 cursor-pointer transition-all duration-300 relative bg-gradient-to-b ${pkg.color} ${
                isSelected
                  ? 'ring-2 ring-gold-400 scale-[1.02] shadow-xl shadow-gold-500/10'
                  : 'hover:border-gold-400/50 hover:scale-[1.01]'
              }`}
            >
              {pkg.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-400 text-dark-900 text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{pkg.badge}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold bg-dark-900/60 border ${pkg.color}`}>
                  {pkg.rate}
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white mb-1">{pkg.name}</h3>
              <div className="text-2xl font-black text-white mb-4">{pkg.range}</div>

              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-gold-400 shrink-0" /> Real-time daily payout
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-gold-400 shrink-0" /> 25-Level team bonus eligible
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-gold-400 shrink-0" /> No fixed lock-in period
                </li>
              </ul>

              <button
                type="button"
                className={`mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                  isSelected
                    ? 'bg-gold-400 text-dark-900 shadow-md'
                    : 'bg-dark-900/80 text-gray-300 hover:text-white border border-dark-500'
                }`}
              >
                {isSelected ? 'Selected Package' : 'Select Tier'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Investment Form Card */}
      <div className="rounded-2xl border border-gold-500/30 bg-dark-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleInvest} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-500 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-gold-400" /> Activate Investment
              </h3>
              <p className="text-xs text-gray-400">Minimum $100. Rates dynamically scale with your investment amount.</p>
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-400">Matched Package: </span>
              <span className="text-sm font-bold text-gold-400">{preview.name}</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Quick Amounts</label>
            <div className="flex flex-wrap gap-2">
              {[100, 500, 1000, 2500, 5000, 7500, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    numAmount === preset
                      ? 'bg-gold-400 text-dark-900 border-gold-400 shadow-md'
                      : 'bg-dark-700 text-gray-300 border-dark-500 hover:border-gold-400/50'
                  }`}
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Enter Amount ($ USD)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gold-400">
                <DollarSign size={20} />
              </div>
              <input
                type="number"
                min="100"
                step="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter investment amount (e.g. 1000)"
                className="w-full bg-dark-900 text-white rounded-xl pl-11 pr-4 py-3.5 border border-dark-500 focus:border-gold-400 focus:outline-none text-lg font-bold"
                required
              />
            </div>
          </div>

          {/* Real-time Profit Preview */}
          <div className="grid sm:grid-cols-3 gap-4 rounded-xl bg-dark-900/90 p-4 border border-dark-500">
            <div>
              <span className="text-[11px] text-gray-400 block">Daily Return Rate</span>
              <span className="text-base font-extrabold text-gold-400">{preview.ratePercent.toFixed(4)}%</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">Estimated Daily Profit</span>
              <span className="text-base font-extrabold text-emerald-400">${estimatedDaily.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">Estimated Monthly Profit</span>
              <span className="text-base font-extrabold text-white">${estimatedMonthly.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || numAmount < 100}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-extrabold text-base hover:brightness-110 transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} /> Processing Investment...
              </>
            ) : (
              <>
                Confirm & Start Earning (${numAmount.toLocaleString()})
              </>
            )}
          </button>
        </form>
      </div>

      {/* Active Investments History */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={18} className="text-gold-400" /> My Investments
          </h3>
          <button
            onClick={fetchInvestments}
            className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {fetching ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading investments...</div>
        ) : myInvestments.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <p className="text-gray-400 text-sm">No active investments found.</p>
            <p className="text-xs text-gray-500 mt-1">Submit the form above to start earning daily returns!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Package</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Daily Rate</th>
                  <th className="px-4 py-3">Total Earned</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {myInvestments.map((inv) => (
                  <tr key={inv._id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-3.5 font-bold text-white">{inv.packageName}</td>
                    <td className="px-4 py-3.5 font-bold text-gold-400">${Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3.5">{inv.dailyRate}%</td>
                    <td className="px-4 py-3.5 text-emerald-400 font-bold">${Number(inv.totalProfitEarned || 0).toFixed(2)}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {new Date(inv.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
