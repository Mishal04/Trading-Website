import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInvestorAuth } from '../../context/InvestorAuthContext';
import { investorAPI } from '../../services/api';
import { getInvestorPackageInfo } from '../../utils/investorConstants';
import {
  TrendingUp, Wallet, BarChart2, Clock, LogOut,
  PlusCircle, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, ArrowUpRight,
  Copy, Check as CheckIcon, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── payment method details (shared with InvestTab) ───────────────────────────
const PAYMENT_METHODS = {
  BEP20: {
    label:   'USDT (BEP20)',
    sub:     'Binance Smart Chain',
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
  BANK: {
    label: 'Bank Transfer',
    sub:   'India — IMPS / NEFT / RTGS',
    type:  'bank',
    fields: [
      { label: 'Bank Name',      value: 'UTKARSH SFB' },
      { label: 'Account Name',   value: 'OBO ENTERPRISES' },
      { label: 'Account Number', value: '1603020000000728' },
      { label: 'IFSC Code',      value: 'UTKS0001603' },
      { label: 'Branch',         value: 'Kharghar' },
      { label: 'Account Type',   value: 'CURRENT' },
    ],
    note: 'Use IMPS / NEFT / RTGS. Enter the bank reference number as your Transaction ID below.',
  },
};

const PLAN_A = [
  { pkg: 1, amounts: [100, 200, 300, 900],               rate: '1.00%/day', label: 'Package 1' },
  { pkg: 2, amounts: [1000, 2000, 3000, 5000],           rate: '1.00%/day', label: 'Package 2' },
  { pkg: 3, amounts: [6000, 7000, 8000, 9000],           rate: '1.00%/day', label: 'Package 3' },
  { pkg: 4, amounts: [10000, 15000, 20000, 25000],       rate: '1.25%/day', label: 'Package 4' }
];
const PLAN_B = [
  { pkg: 1, amounts: [100, 200, 300, 900],               rate: '0.75%/day', label: 'Package 1' },
  { pkg: 2, amounts: [1000, 2000, 3000, 5000],           rate: '0.75%/day', label: 'Package 2' },
  { pkg: 3, amounts: [6000, 7000, 8000, 9000],           rate: '0.75%/day', label: 'Package 3' },
  { pkg: 4, amounts: [10000, 15000, 20000, 25000],       rate: '1.00%/day', label: 'Package 4' }
];

function StatCard({ icon: Icon, label, value, sub, color = 'amber' }) {
  const colors = {
    amber:   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#f59e0b' },
    emerald: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)', text: '#10b981' },
    blue:    { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)', text: '#3b82f6' },
    purple:  { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', text: '#8b5cf6' }
  };
  const c = colors[color];
  return (
    <div className="rounded-2xl border p-5" style={{ background: c.bg, borderColor: c.border }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.text + '22' }}>
          <Icon size={18} style={{ color: c.text }} />
        </div>
        <p className="text-gray-400 text-sm">{label}</p>
      </div>
      <p className="text-white text-2xl font-black">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
    active:    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
    completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Completed' },
    rejected:  { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' }
  };
  const s = map[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>;
}

export default function InvestorDashboard() {
  const { investor, logout } = useInvestorAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // New investment form
  const [invAmount, setInvAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BEP20');
  const [copiedField, setCopiedField] = useState(null);
  const [txId, setTxId] = useState('');
  const [payNote, setPayNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const copyToClipboard = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await investorAPI.dashboard();
      setData(res.data?.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleLogout = () => { logout(); navigate('/investor/login'); };

  const handleSubmitInvestment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await investorAPI.createInvestment({
        amount: Number(invAmount),
        transactionId: txId,
        paymentNote: payNote
      });
      toast.success('Investment submitted! Awaiting admin approval.');
      setInvAmount(''); setTxId(''); setPayNote('');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawPrincipal = async (investmentId) => {
    if (!window.confirm('Withdraw principal? The investment will be closed.')) return;
    try {
      await investorAPI.withdrawPrincipal({ investmentId });
      toast.success('Principal withdrawal requested. Contact admin to process transfer.');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const planPackages = investor?.plan === 'B' ? PLAN_B : PLAN_A;
  const numInvAmount = parseFloat(invAmount) || 0;
  const pkgInfo = getInvestorPackageInfo(numInvAmount, investor?.plan || 'A');
  const dailyRateDecimal = pkgInfo ? pkgInfo.dailyRate : 0;
  const dailyRatePercent = dailyRateDecimal * 100;
  const estimatedDailyProfit = numInvAmount * dailyRateDecimal;
  const estimatedMonthlyProfit = estimatedDailyProfit * 30;

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const wallet = data?.wallet || { capital: 0, roi: 0 };
  const investments = data?.investments || [];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0a0e1a 0%,#0d1a2e 100%)' }}>
      {/* Navbar */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">SolveXTrade</p>
            <p className="text-amber-400 text-xs">Investor Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-white font-semibold text-sm">{investor?.name}</p>
            <p className="text-amber-400 text-xs font-bold">Phase {investor?.plan === 'A' ? '1' : investor?.plan === 'B' ? '2' : '1'}</p>
          </div>
          {data?.sixMonthsReached && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-semibold">
              8%–10% Monthly Mode
            </span>
          )}
          <button onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Wallet}   label="Capital Wallet"  value={`$${wallet.capital.toFixed(2)}`}
                    sub="Deposited principal" color="amber" />
          <StatCard icon={TrendingUp} label="ROI Wallet" value={`$${wallet.roi.toFixed(2)}`}
                    sub="Accumulated ROI" color="emerald" />
          <StatCard icon={BarChart2} label="Total Invested" value={`$${(stats.totalInvested || 0).toFixed(2)}`}
                    sub={`${stats.activeCount || 0} active investment(s)`} color="blue" />
          <StatCard icon={Clock}    label="Total ROI Earned" value={`$${(stats.totalRoiEarned || 0).toFixed(2)}`}
                    sub={`3× cap = $${((stats.totalInvested || 0) * 3).toFixed(2)}`} color="purple" />
        </div>

        {/* 6-month notice */}
        {data?.sixMonthsReached && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 px-5 py-4 flex items-center gap-3"
               style={{ background: 'rgba(16,185,129,0.08)' }}>
            <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-emerald-400 font-bold text-sm">6-Month Milestone Reached</p>
              <p className="text-gray-400 text-xs">Your ROI has switched to <strong className="text-emerald-400">8%–10% per month</strong> on all active investments.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl border border-white/8 w-fit"
             style={{ background: 'rgba(255,255,255,0.03)' }}>
          {['overview', 'invest', 'investments'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                      activeTab === tab
                        ? 'text-dark-900 shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={activeTab === tab ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)' } : {}}>
              {tab}
            </button>
          ))}
        </div>

        {/* ─── Overview tab ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Plan info */}
            <div className="rounded-3xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart2 size={18} className="text-amber-400" />
                Your Phase {investor?.plan === 'A' ? '1' : '2'} — Package Rates
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {planPackages.map(p => (
                  <div key={p.pkg} className="rounded-xl border border-white/8 p-4"
                       style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-amber-400 font-bold text-sm">{p.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {Array.isArray(p.amounts)
                        ? p.amounts.map(a => typeof a === 'number' ? `$${a.toLocaleString()}` : a).join(', ')
                        : p.amounts}
                    </p>
                    <p className="text-white font-extrabold text-lg mt-2">{p.rate}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/8 grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">After 6 months</p>
                  <p className="text-emerald-400 font-bold">8%–10% / month</p>
                </div>
                <div>
                  <p className="text-gray-500">Income cap</p>
                  <p className="text-white font-bold">3× invested</p>
                </div>
                <div>
                  <p className="text-gray-500">Principal</p>
                  <p className="text-white font-bold">Withdraw anytime</p>
                </div>
              </div>
            </div>

            {/* Recent investments */}
            <div className="rounded-3xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <h3 className="text-white font-bold mb-4">Recent Investments</h3>
              {investments.length === 0 ? (
                <p className="text-gray-500 text-sm">No investments yet. Go to the <button onClick={() => setActiveTab('invest')} className="text-amber-400 hover:underline">Invest tab</button> to get started.</p>
              ) : (
                <div className="space-y-3">
                  {investments.slice(0, 5).map(inv => (
                    <div key={inv._id} className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3"
                         style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div>
                        <p className="text-white font-semibold text-sm">${inv.amount.toLocaleString()} – Pkg {inv.packageNumber}</p>
                        <p className="text-gray-500 text-xs">Phase {inv.plan === 'A' ? '1' : '2'} · {(inv.dailyRate * 100).toFixed(2)}%/day</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={inv.status} />
                        <p className="text-gray-500 text-xs mt-1">ROI: ${inv.totalRoiEarned.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Invest tab ───────────────────────────────────────────────── */}
        {activeTab === 'invest' && (
          <div className="rounded-3xl border border-white/10 p-8 max-w-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <h3 className="text-white font-bold text-xl mb-2">New Investment</h3>
            <p className="text-gray-400 text-sm mb-6">
              Invest based on your <strong className="text-amber-400">Phase {investor?.plan === 'A' ? '1' : '2'}</strong> packages.
              Your submission will be reviewed by admin.
            </p>

            <form onSubmit={handleSubmitInvestment} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Amount (USD)
                </label>
                <input id="inv-amount" type="number" required min="100" step="1"
                       value={invAmount} onChange={e => setInvAmount(e.target.value)}
                       placeholder="e.g. 1000"
                       className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {planPackages.flatMap(p =>
                    p.amounts.filter(a => typeof a === 'number').slice(0, 1).map(a => (
                      <button key={a} type="button" onClick={() => setInvAmount(String(a))}
                              className="text-xs py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition">
                        ${a.toLocaleString()}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* ── Live Estimated Profit Preview ── */}
              {numInvAmount >= 100 && pkgInfo ? (
                <div
                  className="grid grid-cols-3 gap-3 rounded-2xl p-4 border"
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <div>
                    <span className="text-[11px] text-gray-400 block font-medium">Daily Return Rate</span>
                    <span className="text-sm sm:text-base font-extrabold text-amber-400">
                      {dailyRatePercent.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Package {pkgInfo.packageNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block font-medium">Estimated Daily Profit</span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                      ${estimatedDailyProfit.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 block">per day</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block font-medium">Estimated Monthly Profit</span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      ${estimatedMonthlyProfit.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 block">30-day est.</span>
                  </div>
                </div>
              ) : numInvAmount > 0 && numInvAmount < 100 ? (
                <div
                  className="rounded-xl p-3 border text-xs text-amber-400/90"
                  style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                >
                  Minimum investment amount is $100.
                </div>
              ) : null}

              {/* ── Payment Method ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(PAYMENT_METHODS).map(([id, method]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPayMethod(id)}
                      className="p-2.5 rounded-xl text-left border transition-all"
                      style={{
                        background:  payMethod === id ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                        borderColor: payMethod === id ? '#f59e0b'               : 'rgba(255,255,255,0.1)',
                        boxShadow:   payMethod === id ? '0 0 0 1px rgba(245,158,11,0.4)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: payMethod === id ? '#f59e0b' : '#fff' }}>
                          {method.label}
                        </span>
                        {payMethod === id && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                      </div>
                      <span className="text-[10px] text-gray-500">{method.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Detail card */}
                {(() => {
                  const method = PAYMENT_METHODS[payMethod];
                  if (!method) return null;

                  if (method.type === 'crypto') {
                    return (
                      <div className="rounded-xl border p-4 space-y-3"
                           style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          <Building2 size={12} style={{ color: '#f59e0b' }} />
                          Send {method.label} to this address
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 font-mono text-xs text-white break-all rounded-lg px-3 py-2.5 select-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {method.address}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(method.address, payMethod)}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors"
                            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
                          >
                            {copiedField === payMethod
                              ? <><CheckIcon size={12} /> Copied</>
                              : <><Copy size={12} /> Copy</>}
                          </button>
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(245,158,11,0.75)' }}>
                          ⚠ {method.note}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-xl border p-4 space-y-2"
                         style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        <Building2 size={12} style={{ color: '#f59e0b' }} />
                        Bank Transfer Details
                      </div>
                      {method.fields.map((f) => (
                        <div key={f.label}
                             className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <span className="text-[11px] text-gray-500 shrink-0 w-28">{f.label}</span>
                          <span className="flex-1 text-xs font-bold text-white text-right font-mono">{f.value}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(f.value, f.label)}
                            className="shrink-0 p-1.5 rounded-md transition-colors"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                            title={`Copy ${f.label}`}
                          >
                            {copiedField === f.label
                              ? <CheckIcon size={12} style={{ color: '#f59e0b' }} />
                              : <Copy size={12} className="text-gray-400 hover:text-amber-400" />}
                          </button>
                        </div>
                      ))}
                      <p className="text-[11px] leading-relaxed pt-1" style={{ color: 'rgba(245,158,11,0.75)' }}>
                        ⚠ {method.note}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Transaction / TXID
                </label>
                <input id="inv-txid" type="text" placeholder="Crypto TXID or reference number"
                       value={txId} onChange={e => setTxId(e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Payment Note (optional)
                </label>
                <textarea id="inv-note" rows={2} placeholder="Additional details…"
                          value={payNote} onChange={e => setPayNote(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm resize-none" />
              </div>

              <button id="inv-submit-btn" type="submit" disabled={submitting}
                      className="w-full py-3.5 rounded-xl font-bold text-dark-900 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                {submitting ? 'Submitting…' : <><PlusCircle size={18} /> Submit Investment</>}
              </button>
            </form>
          </div>
        )}

        {/* ─── Investments tab ──────────────────────────────────────────── */}
        {activeTab === 'investments' && (
          <div className="rounded-3xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <h3 className="text-white font-bold mb-5">All Investments</h3>
            {investments.length === 0 ? (
              <p className="text-gray-500 text-sm">No investments found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase border-b border-white/8">
                      <th className="text-left pb-3 font-semibold">Amount</th>
                      <th className="text-left pb-3 font-semibold">Plan / Pkg</th>
                      <th className="text-left pb-3 font-semibold">Rate</th>
                      <th className="text-left pb-3 font-semibold">ROI Earned</th>
                      <th className="text-left pb-3 font-semibold">Cap</th>
                      <th className="text-left pb-3 font-semibold">Status</th>
                      <th className="text-left pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {investments.map(inv => (
                      <tr key={inv._id} className="hover:bg-white/2 transition">
                        <td className="py-3 text-white font-semibold">${inv.amount.toLocaleString()}</td>
                        <td className="py-3 text-gray-300">Phase {inv.plan === 'A' ? '1' : '2'} / Pkg {inv.packageNumber}</td>
                        <td className="py-3 text-amber-400 font-semibold">
                          {inv.isMonthlyMode ? '8%–10%/mo' : `${(inv.dailyRate * 100).toFixed(2)}%/d`}
                        </td>
                        <td className="py-3 text-emerald-400">${inv.totalRoiEarned.toFixed(4)}</td>
                        <td className="py-3 text-gray-400">${inv.incomeCap.toFixed(2)}</td>
                        <td className="py-3"><StatusBadge status={inv.status} /></td>
                        <td className="py-3">
                          {inv.status === 'active' && !inv.principalWithdrawn && (
                            <button onClick={() => handleWithdrawPrincipal(inv._id)}
                                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded-lg transition">
                              Withdraw Principal
                            </button>
                          )}
                          {inv.principalWithdrawn && <span className="text-xs text-gray-500">Principal out</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
