import { useState, useEffect } from 'react';
import { investmentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  PiggyBank, Sparkles, CheckCircle2, TrendingUp,
  DollarSign, RefreshCw, Layers, Clock, XCircle,
  AlertTriangle, Hash, FileText, MessageSquare,
} from 'lucide-react';

// ─── package definitions ──────────────────────────────────────────────────────
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

// ─── status badge helper ──────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:   'bg-amber-400/10  text-amber-400  border-amber-400/20',
  active:    'bg-emerald-400/10 text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-400/10   text-red-400    border-red-400/20',
  cancelled: 'bg-gray-400/10  text-gray-400   border-gray-400/20',
  withdrawn: 'bg-blue-400/10  text-blue-400   border-blue-400/20',
  completed: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border capitalize ${STATUS_STYLE[status] ?? 'text-gray-400'}`}>
    {status === 'pending'  && <Clock size={10} />}
    {status === 'active'   && <CheckCircle2 size={10} />}
    {status === 'rejected' && <XCircle size={10} />}
    {status}
  </span>
);

// ─── package rate preview ─────────────────────────────────────────────────────
const getPackagePreview = (val) => {
  if (val >= 7500) {
    const rate = Math.min(2.00, 1.50 + ((val - 7500) / 10000) * 0.50);
    return { tier: 3, name: 'Tier 3 VIP', ratePercent: rate };
  }
  if (val >= 1000) {
    const rate = 1.00 + ((val - 1000) / 4000) * 0.25;
    return { tier: 2, name: 'Tier 2 Standard', ratePercent: rate };
  }
  const rate = 0.35 + ((val - 100) / 400) * 0.15;
  return { tier: 1, name: 'Tier 1 Basic', ratePercent: Math.max(0.35, rate) };
};

// ─── main component ───────────────────────────────────────────────────────────
export default function InvestTab({ onRefresh }) {
  const [amount, setAmount]             = useState('1000');
  const [transactionId, setTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentNote, setPaymentNote]   = useState('');
  const [loading, setLoading]           = useState(false);
  const [myInvestments, setMyInvestments] = useState([]);
  const [fetching, setFetching]         = useState(true);

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

  useEffect(() => { fetchInvestments(); }, []);

  const numAmount = parseFloat(amount) || 0;
  const preview   = getPackagePreview(numAmount);
  const estimatedDaily   = (numAmount * preview.ratePercent) / 100;
  const estimatedMonthly = estimatedDaily * 30;

  const handleInvest = async (e) => {
    e.preventDefault();

    if (numAmount < 100) {
      toast.error('Minimum investment amount is $100');
      return;
    }
    if (!transactionId.trim()) {
      toast.error('Transaction ID / Reference Number is required');
      return;
    }

    try {
      setLoading(true);
      const res = await investmentAPI.create({
        amount:        numAmount,
        transactionId: transactionId.trim(),
        paymentProof:  paymentProof.trim(),
        paymentNote:   paymentNote.trim(),
      });
      toast.success(res.data.message || 'Investment submitted! Awaiting admin approval.');
      // Reset proof fields after submit
      setTransactionId('');
      setPaymentProof('');
      setPaymentNote('');
      fetchInvestments();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.message
        || 'Failed to submit investment';
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
          Select a tier, fill in your payment details, and submit. Admin will verify and activate.
        </p>
      </div>

      {/* Package cards */}
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
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400 shrink-0" /> Real-time daily payout</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400 shrink-0" /> 25-Level team bonus eligible</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400 shrink-0" /> No fixed lock-in period</li>
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

      {/* Investment + Payment Proof Form */}
      <div className="rounded-2xl border border-gold-500/30 bg-dark-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleInvest} className="space-y-6">

          {/* Form header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-500 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-gold-400" /> Activate Investment
              </h3>
              <p className="text-xs text-gray-400">Minimum $100. Fill in payment proof so admin can verify.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Package: </span>
              <span className="text-sm font-bold text-gold-400">{preview.name}</span>
            </div>
          </div>

          {/* Quick preset amounts */}
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

          {/* Amount input */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              Investment Amount (USD) <span className="text-red-400">*</span>
            </label>
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

          {/* Rate preview */}
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

          {/* ── Payment Proof Section ── */}
          <div className="rounded-xl border border-dark-500 bg-dark-900/50 p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-dark-600">
              <FileText size={16} className="text-gold-400" />
              <h4 className="text-sm font-bold text-white">Payment Proof</h4>
              <span className="text-xs text-gray-500 ml-1">Admin will review this before activation</span>
            </div>

            {/* Transaction ID — required */}
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Hash size={12} className="text-gold-400" />
                Transaction ID / Reference Number
                <span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. TXN123456, JazzCash ref, USDT TXID…"
                maxLength={100}
                required
                className="w-full bg-dark-800 text-white rounded-xl px-4 py-2.5 border border-dark-500 focus:border-gold-400 focus:outline-none text-sm placeholder-gray-600 transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Enter the transaction ID or reference from your payment method (JazzCash, bank transfer, crypto TXID etc.)
              </p>
            </div>

            {/* Payment proof URL / note — optional */}
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <FileText size={12} className="text-gold-400" />
                Payment Proof URL or Screenshot Link
                <span className="text-gray-500 ml-1">(optional but recommended)</span>
              </label>
              <input
                type="text"
                value={paymentProof}
                onChange={(e) => setPaymentProof(e.target.value)}
                placeholder="e.g. https://i.imgur.com/abc.png or Google Drive link…"
                maxLength={500}
                className="w-full bg-dark-800 text-white rounded-xl px-4 py-2.5 border border-dark-500 focus:border-gold-400 focus:outline-none text-sm placeholder-gray-600 transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Upload your screenshot to Imgur, Google Drive, or any image host and paste the link here.
              </p>
            </div>

            {/* Note to admin — optional */}
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={12} className="text-gold-400" />
                Note to Admin
                <span className="text-gray-500 ml-1">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Any extra info for the admin (e.g. sent via bank transfer on 27 Aug)…"
                maxLength={300}
                className="w-full bg-dark-800 text-white rounded-xl px-4 py-2.5 border border-dark-500 focus:border-gold-400 focus:outline-none text-sm placeholder-gray-600 resize-none transition-colors"
              />
            </div>
          </div>

          {/* Admin review notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              After submitting, admin will verify your payment proof and activate the investment.
              Your wallet will only be credited once the admin approves. This usually takes a few hours.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || numAmount < 100 || !transactionId.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-extrabold text-base hover:brightness-110 transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><RefreshCw className="animate-spin" size={18} /> Submitting…</>
            ) : (
              <>Submit Investment (${numAmount.toLocaleString()}) — Pending Review</>
            )}
          </button>
        </form>
      </div>

      {/* My Investments history */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={18} className="text-gold-400" /> My Investments
          </h3>
          <button
            onClick={fetchInvestments}
            className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {fetching ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading investments…</div>
        ) : myInvestments.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <PiggyBank size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No investments found.</p>
            <p className="text-xs text-gray-500 mt-1">Submit the form above to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Package</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Txn ID</th>
                  <th className="px-4 py-3">Daily Rate</th>
                  <th className="px-4 py-3">Earned</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {myInvestments.map((inv) => (
                  <tr key={inv._id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-3.5 font-bold text-white">{inv.packageName}</td>
                    <td className="px-4 py-3.5 font-bold text-gold-400">${Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-300 max-w-[120px] truncate" title={inv.transactionId}>
                      {inv.transactionId || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">{inv.dailyRate}%</td>
                    <td className="px-4 py-3.5 text-emerald-400 font-bold">
                      ${Number(inv.totalProfitEarned || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
