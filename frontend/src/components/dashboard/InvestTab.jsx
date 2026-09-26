import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { investmentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  PiggyBank, Sparkles, CheckCircle2,
  RefreshCw, Layers, Clock, XCircle,
  AlertTriangle, Hash, FileText, MessageSquare,
  Copy, Check as CheckIcon, Building2,
} from 'lucide-react';

// ─── payment method details ───────────────────────────────────────────────────
const PAYMENT_METHODS = {
  BEP20: {
    label:   'USDT (BEP20)',
    sub:     'Binance Smart Chain',
    type:    'crypto',
    address: '0x7bb5df2531e8ac0086eba3a0e68c25fb0ec0f4cd',
    note:    'Send only USDT on the BNB Smart Chain (BEP20). Sending other tokens or on wrong network will result in permanent loss.',
  },
  TRC20: {
    label:   'USDT (TRC20)',
    sub:     'TRON Network',
    type:    'crypto',
    address: 'TC5WYzEVnwETtvPq8FZzYkKzcNoqMG9ezV',
    note:    'Send only USDT on the TRON network (TRC20). Do not send from exchanges that don\'t support TRC20.',
  },
  BANK: {
    label: 'Bank Transfer',
    sub:   'India — IMPS / NEFT / RTGS',
    type:  'bank',
    fields: [
      { label: 'Bank Name',       value: 'UTKARSH SFB' },
      { label: 'Account Name',    value: 'OBO ENTERPRISES' },
      { label: 'Account Number',  value: '1603020000000728' },
      { label: 'IFSC Code',       value: 'UTKS0001603' },
      { label: 'Branch',          value: 'Kharghar' },
      { label: 'Account Type',    value: 'CURRENT' },
    ],
    note: 'Use IMPS / NEFT / RTGS. Enter the bank reference number as your Transaction ID below.',
  },
};

// ─── discrete package definitions (4 dollar tiers matching landing page) ────
// Rates are Plan-dependent: locked at investment time based on user's plan
const PACKAGES = [
  {
    id: 1,
    label: '$100 - $900',
    amounts: [100, 200, 300, 900],
    ratesPerPlan: {
      A: '1.00% Daily',   // Plan A (Phase 1)
      B: '0.75% Daily'    // Plan B (Phase 2+)
    },
    color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  },
  {
    id: 2,
    label: '$1,000 - $5,000',
    amounts: [1000, 2000, 3000, 5000],
    ratesPerPlan: {
      A: '1.00% Daily',   // Plan A (Phase 1)
      B: '0.75% Daily'    // Plan B (Phase 2+)
    },
    color: 'from-gold-500/20 to-gold-600/5 border-gold-500/40 text-gold-400',
    featured: true,
  },
  {
    id: 3,
    label: '$6,000 - $9,000',
    amounts: [6000, 7000, 8000, 9000],
    ratesPerPlan: {
      A: '1.00% Daily',   // Plan A (Phase 1)
      B: '0.75% Daily'    // Plan B (Phase 2+)
    },
    color: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
  },
  {
    id: 4,
    label: '$10,000 - $25,000',
    amounts: [10000, 15000, 20000, 25000],
    ratesPerPlan: {
      A: '1.25% Daily',   // Plan A (Phase 1)
      B: '1.00% Daily'    // Plan B (Phase 2+)
    },
    color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
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

// ─── package lookup for selected amount ──────────────────────────────────────
const getPackageForAmount = (val) => {
  for (const pkg of PACKAGES) {
    if (pkg.amounts.includes(val)) {
      return { pkgId: pkg.id, label: pkg.label };
    }
  }
  return { pkgId: 1, label: '$100 - $900' };
};

// ─── main component ───────────────────────────────────────────────────────────
export default function InvestTab({ onRefresh }) {
  const { user } = useAuth();  // Get current user including plan
  const [amount, setAmount]             = useState('1000');
  const [selectedTier, setSelectedTier] = useState(2);
  const [network, setNetwork]           = useState('BEP20');
  const [copiedField, setCopiedField]   = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentNote, setPaymentNote]   = useState('');
  const [loading, setLoading]           = useState(false);

  const copyToClipboard = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };
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

  const activePkg = PACKAGES.find(p => p.id === selectedTier);
  const numAmount = parseFloat(amount) || 0;
  const userPlan = user?.plan || 'A';  // Default to Plan A if not set
  const rateStr = activePkg ? activePkg.ratesPerPlan[userPlan] : '1.00% Daily';
  const ratePercent = parseFloat(rateStr);  // Extract numeric value (e.g., "1.00% Daily" → 1.00)
  const estimatedDaily   = (numAmount * ratePercent) / 100;
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

    const fullNote = [`[Network: ${network}]`, paymentNote.trim()].filter(Boolean).join(' ');

    try {
      setLoading(true);
      // Phase 2 endpoint: uses /plan instead of /create
      const res = await investmentAPI.plan({
        amount:        numAmount,
        transactionId: transactionId.trim(),
        paymentProof:  paymentProof.trim(),
        paymentNote:   fullNote,
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
          Select a dollar tier. Your current Plan (<strong>{userPlan === 'A' ? 'Plan A (Phase 1)' : 'Plan B (Phase 2+)'}</strong>) determines your daily rate.
        </p>
      </div>

      {/* Package cards — 4 dollar tiers (row 1) */}
      <div className="grid md:grid-cols-4 gap-4">
        {PACKAGES.map((pkg) => {
          const isSelected = selectedTier === pkg.id;
          const rateForPlan = pkg.ratesPerPlan[userPlan];
          return (
            <div
              key={pkg.id}
              onClick={() => {
                setSelectedTier(pkg.id);
                setAmount(pkg.amounts[0].toString());
              }}
              className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 relative bg-gradient-to-b ${pkg.color} ${
                isSelected
                  ? 'ring-2 ring-gold-400 scale-[1.02] shadow-xl shadow-gold-500/10'
                  : 'hover:border-gold-400/50 hover:scale-[1.01]'
              }`}
            >
              {pkg.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-400 text-dark-900 text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-md">
                  Recommended
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{pkg.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold bg-dark-900/60 border ${pkg.color}`}>
                  {rateForPlan}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mb-1">Dollar Tier {pkg.id}</h3>
              <p className="text-xs text-gray-400">
                ${pkg.amounts[0].toLocaleString()} – ${pkg.amounts[pkg.amounts.length - 1].toLocaleString()}
              </p>
              <button
                type="button"
                className={`mt-4 w-full py-2 rounded-xl font-bold text-xs transition-colors ${
                  isSelected
                    ? 'bg-gold-400 text-dark-900 shadow-md'
                    : 'bg-dark-900/80 text-gray-300 hover:text-white border border-dark-500'
                }`}
              >
                {isSelected ? 'Selected' : 'Select Tier'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Plan info note */}
      <p className="text-[11px] text-gray-500 text-center -mt-4">
        Rates are locked at investment time based on your current Plan ({userPlan}). After 6 months, your rate switches to 8–10% monthly.
      </p>

      {/* Investment + Payment Proof Form */}
      <div className="rounded-2xl border border-gold-500/30 bg-dark-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleInvest} className="space-y-6">

          {/* Form header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-500 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-gold-400" /> Activate Investment
              </h3>
              <p className="text-xs text-gray-400">Select a dollar tier and amount below. Fill in payment proof so admin can verify.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Tier: </span>
              <span className="text-sm font-bold text-gold-400">{activePkg ? activePkg.label : '$100 - $900'}</span>
            </div>
          </div>

          {/* Amount buttons for selected tier (row 2) */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              Select Amount — {activePkg ? activePkg.label : '$100 - $900'} (USD)
            </label>
            <div className="flex flex-wrap gap-2">
              {(activePkg ? activePkg.amounts : []).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
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

          {/* Rate preview */}
          <div className="grid sm:grid-cols-3 gap-4 rounded-xl bg-dark-900/90 p-4 border border-dark-500">
            <div>
              <span className="text-[11px] text-gray-400 block">Daily Return Rate</span>
              <span className="text-base font-extrabold text-gold-400">{ratePercent.toFixed(2)}%</span>
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
              <h4 className="text-sm font-bold text-white">Payment Proof & Network</h4>
              <span className="text-xs text-gray-500 ml-1">Admin will verify on blockchain</span>
            </div>

            {/* Network / Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-2 block">
                Payment Method <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(PAYMENT_METHODS).map(([id, method]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNetwork(id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      network === id
                        ? 'bg-gold-400/10 border-gold-400 ring-1 ring-gold-400/50 shadow-md'
                        : 'bg-dark-800 border-dark-500 hover:border-dark-400 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${network === id ? 'text-gold-400' : 'text-white'}`}>
                        {method.label}
                      </span>
                      {network === id && <CheckCircle2 size={14} className="text-gold-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-gray-500">{method.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment destination details */}
            {(() => {
              const method = PAYMENT_METHODS[network];
              if (!method) return null;

              if (method.type === 'crypto') {
                return (
                  <div className="rounded-xl border border-dark-500 bg-dark-950/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <Building2 size={13} className="text-gold-400" />
                      Send {method.label} to this address
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-mono text-xs text-white break-all bg-dark-900 border border-dark-600 rounded-lg px-3 py-2.5 select-all">
                        {method.address}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(method.address, network)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gold-400/10 border border-gold-400/30 text-gold-400 hover:bg-gold-400/20 transition-colors text-xs font-bold"
                      >
                        {copiedField === network
                          ? <><CheckIcon size={13} /> Copied</>
                          : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-400/80 leading-relaxed">
                      ⚠ {method.note}
                    </p>
                  </div>
                );
              }

              // Bank transfer
              return (
                <div className="rounded-xl border border-dark-500 bg-dark-950/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Building2 size={13} className="text-gold-400" />
                    Bank Transfer Details
                  </div>
                  <div className="space-y-2">
                    {method.fields.map((f) => (
                      <div key={f.label} className="flex items-center justify-between gap-3 rounded-lg bg-dark-900 border border-dark-600 px-3 py-2.5">
                        <span className="text-[11px] text-gray-500 shrink-0 w-32">{f.label}</span>
                        <span className="flex-1 text-xs font-bold text-white text-right font-mono">{f.value}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(f.value, f.label)}
                          className="shrink-0 p-1.5 rounded-md bg-dark-700 text-gray-400 hover:text-gold-400 transition-colors"
                          title={`Copy ${f.label}`}
                        >
                          {copiedField === f.label
                            ? <CheckIcon size={12} className="text-gold-400" />
                            : <Copy size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">
                    ⚠ {method.note}
                  </p>
                </div>
              );
            })()}

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
