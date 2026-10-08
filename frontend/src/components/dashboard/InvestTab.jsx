import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { investmentAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  PiggyBank, Sparkles, CheckCircle2,
  RefreshCw, Layers, Clock, XCircle,
  AlertTriangle, Hash, FileText, MessageSquare,
  Copy, Check as CheckIcon, Building2, Loader,
  ShieldCheck, Info, Coins, Landmark,
} from 'lucide-react';

// ─── payment method defaults (bank info is static) ────────────────────────────
const PAYMENT_METHODS_BASE = {
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
    note: 'Use IMPS / NEFT / RTGS. Enter the bank UTR / reference number as your Transaction ID below.',
  },
  BEP20: {
    label:   'USDT (BEP20)',
    sub:     'BNB Smart Chain',
    type:    'crypto',
    address: '0x7bb5df2531e8ac0086eba3a0e68c25fb0ec0f4cd',
    note:    'Send only USDT on the BNB Smart Chain (BEP20). Sending on the wrong network will result in permanent loss.',
  },
  TRC20: {
    label:   'USDT (TRC20)',
    sub:     'TRON Network',
    type:    'crypto',
    address: 'TC5WYzEVnwETtvPq8FZzYkKzcNoqMG9ezV',
    note:    "Send only USDT on the TRON network (TRC20). Do not send from exchanges that don't support TRC20.",
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
  const numVal = parseFloat(val) || 0;
  
  // First: check if it's a preset amount
  for (const pkg of PACKAGES) {
    if (pkg.amounts.includes(numVal)) {
      return { pkgId: pkg.id, label: pkg.label };
    }
  }
  
  // Second: check if it falls within a tier's range
  for (const pkg of PACKAGES) {
    const min = Math.min(...pkg.amounts);
    const max = Math.max(...pkg.amounts);
    if (numVal >= min && numVal <= max) {
      return { pkgId: pkg.id, label: pkg.label };
    }
  }
  
  // Fallback
  return { pkgId: 1, label: '$100 - $900', error: 'Amount outside valid ranges' };
};

// ─── main component ───────────────────────────────────────────────────────────
export default function InvestTab({ onRefresh }) {
  const { user } = useAuth();  // Get current user including plan
  const [amount, setAmount]             = useState('1000');
  const [amountError, setAmountError]   = useState('');
  const [selectedTier, setSelectedTier] = useState(2);
  const [network, setNetwork]           = useState('BANK');
  const [copiedField, setCopiedField]   = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentNote, setPaymentNote]   = useState('');
  const [loading, setLoading]           = useState(false);
  
  // Dynamic wallet state
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS_BASE);
  const [walletLoading, setWalletLoading] = useState(true);

  const copyToClipboard = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fetch current wallet from backend
  const fetchCurrentWallet = async () => {
    try {
      setWalletLoading(true);
      const res = await adminAPI.getCurrentWallet();
      const wallet = res.data?.data?.wallet;
      
      if (wallet && wallet.address) {
        // Build crypto payment method from current wallet
        const methodKey = wallet.network || 'BEP20';
        setPaymentMethods(prev => ({
          ...prev,
          [methodKey]: {
            label: `${wallet.label || 'USDT'} (${wallet.network})`,
            sub: wallet.network === 'BEP20' ? 'BNB Smart Chain' : wallet.network === 'TRC20' ? 'TRON Network' : wallet.network,
            type: 'crypto',
            address: wallet.address,
            note: `Send only USDT on the ${wallet.network} network. ${wallet.notes || 'Double-check the address before sending.'}`,
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setWalletLoading(false);
    }
  };

  // Fetch wallet on mount
  useEffect(() => {
    fetchCurrentWallet();
  }, []);

  const handleAmountChange = (val) => {
    setAmount(val);
    
    // Validate the amount
    const numVal = parseFloat(val) || 0;
    if (val.trim() === '') {
      setAmountError('');
      return;
    }

    if (numVal < 100) {
      setAmountError('Minimum investment is $100');
      return;
    }

    // Check if amount is within any tier range
    const pkgInfo = getPackageForAmount(numVal);
    if (pkgInfo.error) {
      setAmountError(`Amount $${numVal} is outside all valid ranges. Valid ranges: $100-$900, $1,000-$5,000, $6,000-$9,000, $10,000-$25,000`);
      return;
    }

    // Auto-detect tier for this amount
    if (pkgInfo.pkgId !== selectedTier) {
      setSelectedTier(pkgInfo.pkgId);
    }

    setAmountError('');
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
    console.log('handleInvest called', { transactionId, amount, network });

    if (numAmount < 100) {
      console.warn('Validation failed: amount too low', numAmount);
      toast.error('Minimum investment amount is $100');
      return;
    }

    // Check if amount is in valid range
    const pkgInfo = getPackageForAmount(numAmount);
    if (pkgInfo.error) {
      console.warn('Validation failed: amount outside valid ranges', numAmount);
      toast.error(pkgInfo.error);
      return;
    }

    if (!transactionId.trim()) {
      console.warn('Validation failed: no transaction ID');
      toast.error('Transaction ID / Reference Number is required');
      return;
    }

    const fullNote = [`[Network: ${network}]`, paymentNote.trim()].filter(Boolean).join(' ');
    console.log('Payload to send:', {
      amount: numAmount,
      transactionId: transactionId.trim(),
      paymentProof: paymentProof.trim(),
      paymentNote: fullNote,
    });

    try {
      setLoading(true);
      console.log('Making API call to /investments/plan');
      // Phase 2 endpoint: uses /plan instead of /create
      const res = await investmentAPI.plan({
        amount:        numAmount,
        transactionId: transactionId.trim(),
        paymentProof:  paymentProof.trim(),
        paymentNote:   fullNote,
      });
      console.log('API response received:', res);
      toast.success(res.data.message || 'Investment submitted! Awaiting admin approval.');
      // Reset proof fields after submit
      setTransactionId('');
      setPaymentProof('');
      setPaymentNote('');
      fetchInvestments();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Investment submission failed:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        errors: err.response?.data?.errors,
        fullError: err,
      });
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.message
        || err.message
        || 'Failed to submit investment';
      toast.error(msg);
    } finally {
      setLoading(false);
      console.log('handleInvest completed');
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

          {/* Amount input with preset buttons */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              Amount — {activePkg ? activePkg.label : '$100 - $900'} (USD)
            </label>
            
            {/* Custom input field */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-300">$</span>
                <input
                  type="number"
                  min="100"
                  step="1"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Enter any amount (e.g. 500, 700)"
                  className={`flex-1 bg-dark-700 text-white rounded-xl px-4 py-2.5 border text-sm font-semibold focus:outline-none transition-colors ${
                    amountError
                      ? 'border-red-500/50 focus:border-red-400'
                      : 'border-dark-500 focus:border-gold-400'
                  }`}
                />
              </div>
              {amountError && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {amountError}
                </p>
              )}
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2">
              {(activePkg ? activePkg.amounts : []).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountChange(preset.toString())}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                    numAmount === preset
                      ? 'bg-gold-400 text-dark-900 border-gold-400 shadow-md'
                      : 'bg-dark-700 text-gray-300 border-dark-500 hover:border-gold-400/50'
                  }`}
                  title={`Quick select $${preset.toLocaleString()}`}
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
          <div className="rounded-2xl border border-dark-600 bg-dark-900/60 p-4 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-dark-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold-400/10 border border-gold-400/20 flex items-center justify-center text-gold-400">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Payment Method & Deposit Details</h4>
                  <p className="text-[11px] text-gray-400">
                    {paymentMethods[network]?.type === 'bank'
                      ? 'Admin will verify your transfer against bank statement / UTR'
                      : 'Admin will verify transaction hash on blockchain'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gold-400/10 text-gold-400 border border-gold-400/20">
                <ShieldCheck size={12} /> Secure Deposit
              </span>
            </div>

            {/* Network / Payment Method Selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-1">
                  Select Payment Method <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-gray-400">Choose preferred transfer mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(paymentMethods).map(([id, method]) => {
                  const isSelected = network === id;
                  const isBank = method.type === 'bank';
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNetwork(id)}
                      className={`p-3.5 rounded-xl text-left border transition-all relative overflow-hidden flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-r from-gold-500/15 via-gold-500/10 to-transparent border-gold-400 ring-1 ring-gold-400/40 shadow-lg shadow-gold-500/5'
                          : 'bg-dark-800/90 border-dark-600 hover:border-dark-500 hover:bg-dark-800 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected
                            ? 'bg-gold-400/20 border-gold-400/40 text-gold-400 shadow-inner'
                            : 'bg-dark-700/80 border-dark-600 text-gray-400'
                        }`}>
                          {isBank ? <Building2 size={20} /> : <Coins size={20} />}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${isSelected ? 'text-gold-400' : 'text-white'}`}>
                            {method.label}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">
                            {method.sub}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-gold-400 text-dark-950 flex items-center justify-center font-bold">
                            <CheckCircle2 size={16} className="text-dark-950 fill-gold-400" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-dark-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment destination details */}
            {(() => {
              const method = paymentMethods[network];
              if (!method) return null;

              if (method.type === 'crypto') {
                return (
                  <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-b from-dark-900 via-dark-950 to-dark-900 p-4 sm:p-5 space-y-4 shadow-xl shadow-black/40 relative overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-dark-700/80">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                        <Coins size={15} className="text-gold-400" />
                        Send {method.label} Deposit
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">Network: {method.sub}</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1.5 font-medium">Deposit Address (Click to copy)</span>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <span className="flex-1 font-mono text-xs sm:text-sm text-white break-all bg-dark-900 border border-dark-600 rounded-xl px-3.5 py-3 select-all">
                          {method.address}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(method.address, network)}
                          className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-gold-400/15 hover:bg-gold-400/25 border border-gold-400/40 text-gold-400 hover:text-gold-300 transition-all text-xs font-bold active:scale-95"
                        >
                          {copiedField === network
                            ? <><CheckIcon size={14} className="text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                            : <><Copy size={14} /><span>Copy Address</span></>}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2">
                      <Info size={14} className="shrink-0 mt-0.5 text-amber-400" />
                      <span>{method.note}</span>
                    </div>
                  </div>
                );
              }

              // Bank transfer
              return (
                <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-b from-dark-900 via-dark-950 to-dark-900 p-4 sm:p-5 space-y-4 shadow-xl shadow-black/40 relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Top Bar with Bank Info & Copy All */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-dark-700/80 relative">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-sm font-bold text-white tracking-wide">Official Bank Deposit Account</h5>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck size={10} /> Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">Deposit via IMPS / NEFT / RTGS / NetBanking</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const fullBankText = method.fields.map(f => `${f.label}: ${f.value}`).join('\n');
                        copyToClipboard(fullBankText, 'ALL_BANK_DETAILS');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-gold-400/10 border border-dark-600 hover:border-gold-400/40 text-gray-200 hover:text-gold-400 transition-all text-xs font-semibold active:scale-95 shadow-sm"
                    >
                      {copiedField === 'ALL_BANK_DETAILS' ? (
                        <>
                          <CheckIcon size={14} className="text-emerald-400" />
                          <span className="text-emerald-400 font-bold">All Details Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy All Bank Details</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Prominent Primary Cards: Account Number & IFSC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                    {/* Account Number Box */}
                    <div className="rounded-xl p-3.5 bg-dark-800/90 border border-gold-500/30 hover:border-gold-400/60 transition-all shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400">Account Number</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-dark-700 text-gray-400 font-medium">CURRENT</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="font-mono text-base sm:text-lg font-extrabold text-white tracking-wider select-all">
                          1603020000000728
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('1603020000000728', 'Account Number')}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-400/15 hover:bg-gold-400/25 border border-gold-400/40 text-gold-400 text-xs font-bold transition-all active:scale-95"
                          title="Copy Account Number"
                        >
                          {copiedField === 'Account Number' ? (
                            <><CheckIcon size={13} className="text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
                          ) : (
                            <><Copy size={13} /> Copy</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* IFSC Code Box */}
                    <div className="rounded-xl p-3.5 bg-dark-800/90 border border-gold-500/30 hover:border-gold-400/60 transition-all shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400">IFSC Code</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-dark-700 text-gray-400 font-medium">Kharghar Branch</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="font-mono text-base sm:text-lg font-extrabold text-emerald-400 tracking-wider select-all">
                          UTKS0001603
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('UTKS0001603', 'IFSC Code')}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-400/15 hover:bg-gold-400/25 border border-gold-400/40 text-gold-400 text-xs font-bold transition-all active:scale-95"
                          title="Copy IFSC Code"
                        >
                          {copiedField === 'IFSC Code' ? (
                            <><CheckIcon size={13} className="text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
                          ) : (
                            <><Copy size={13} /> Copy</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-dark-900/90 border border-dark-700/80 px-3.5 py-2.5">
                      <span className="text-xs text-gray-400 font-medium">Bank Name</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">UTKARSH SFB</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('UTKARSH SFB', 'Bank Name')}
                          className="p-1 rounded text-gray-400 hover:text-gold-400 hover:bg-dark-700 transition-colors"
                          title="Copy Bank Name"
                        >
                          {copiedField === 'Bank Name' ? <CheckIcon size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl bg-dark-900/90 border border-dark-700/80 px-3.5 py-2.5">
                      <span className="text-xs text-gray-400 font-medium">Account Name</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">OBO ENTERPRISES</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('OBO ENTERPRISES', 'Account Name')}
                          className="p-1 rounded text-gray-400 hover:text-gold-400 hover:bg-dark-700 transition-colors"
                          title="Copy Account Name"
                        >
                          {copiedField === 'Account Name' ? <CheckIcon size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl bg-dark-900/90 border border-dark-700/80 px-3.5 py-2.5">
                      <span className="text-xs text-gray-400 font-medium">Branch</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Kharghar</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('Kharghar', 'Branch')}
                          className="p-1 rounded text-gray-400 hover:text-gold-400 hover:bg-dark-700 transition-colors"
                          title="Copy Branch"
                        >
                          {copiedField === 'Branch' ? <CheckIcon size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl bg-dark-900/90 border border-dark-700/80 px-3.5 py-2.5">
                      <span className="text-xs text-gray-400 font-medium">Account Type</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">CURRENT</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('CURRENT', 'Account Type')}
                          className="p-1 rounded text-gray-400 hover:text-gold-400 hover:bg-dark-700 transition-colors"
                          title="Copy Account Type"
                        >
                          {copiedField === 'Account Type' ? <CheckIcon size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <Info size={14} className="shrink-0" />
                      <span>Important Deposit Instructions:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-300 text-[11px] leading-relaxed">
                      <li>Send payment from your NetBanking, Google Pay, PhonePe, Paytm or bank branch to the account above.</li>
                      <li>Copy the 12-digit <strong>UTR Number / Reference ID</strong> from your transaction success screen.</li>
                      <li>Paste the UTR number into <strong>Transaction ID / Reference Number</strong> below and submit your request.</li>
                    </ol>
                  </div>
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
          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading || numAmount < 100 || !transactionId.trim() || !!amountError}
              onClick={(e) => {
                console.log('Submit button clicked', {
                  loading,
                  numAmount,
                  transactionId: transactionId.trim() ? '(filled)' : '(empty)',
                  amountValid: numAmount >= 100,
                  amountError,
                  allValid: !(loading || numAmount < 100 || !transactionId.trim() || amountError),
                });
              }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-extrabold text-base hover:brightness-110 transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw className="animate-spin" size={18} /> Submitting…</>
              ) : (
                <>Submit Investment (${numAmount.toLocaleString()}) — Pending Review</>
              )}
            </button>
            {(numAmount < 100 || !transactionId.trim() || amountError) && (
              <p className="text-xs text-amber-300 text-center">
                {amountError
                  ? `⚠ ${amountError}`
                  : !transactionId.trim()
                  ? '⚠ Fill in Transaction ID above to enable this button'
                  : numAmount < 100
                  ? '⚠ Minimum investment is $100'
                  : ''}
              </p>
            )}
          </div>
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
