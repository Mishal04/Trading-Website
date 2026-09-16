import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { Users, TrendingUp, CheckCircle2, XCircle, BarChart2, DollarSign, RefreshCw, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
  const map = {
    pending:   'bg-yellow-500/20 text-yellow-400',
    active:    'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-blue-500/20 text-blue-400',
    rejected:  'bg-red-500/20 text-red-400'
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
      plan === 'A' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'
    }`}>
      Plan {plan}
    </span>
  );
}

export default function AdminInvestors() {
  const [tab, setTab] = useState('investors');

  // ── Investors list ──────────────────────────────────────────────────────────
  const [investors, setInvestors] = useState([]);
  const [invPage, setInvPage]     = useState(1);
  const [invTotal, setInvTotal]   = useState(0);
  const [invSearch, setInvSearch] = useState('');
  const [invPlanFilter, setInvPlanFilter] = useState('');
  const [loadingInv, setLoadingInv] = useState(false);

  const fetchInvestors = useCallback(async () => {
    setLoadingInv(true);
    try {
      const params = { page: invPage, limit: 20 };
      if (invSearch) params.search = invSearch;
      if (invPlanFilter) params.plan = invPlanFilter;
      const res = await adminAPI.getInvestors(params);
      setInvestors(res.data?.data?.investors || []);
      setInvTotal(res.data?.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load investors'); }
    finally { setLoadingInv(false); }
  }, [invPage, invSearch, invPlanFilter]);

  useEffect(() => { if (tab === 'investors') fetchInvestors(); }, [tab, fetchInvestors]);

  // ── Investments list ────────────────────────────────────────────────────────
  const [investments, setInvestments] = useState([]);
  const [invmPage, setInvmPage] = useState(1);
  const [invmTotal, setInvmTotal] = useState(0);
  const [invmStatus, setInvmStatus] = useState('pending');
  const [loadingInvm, setLoadingInvm] = useState(false);

  const fetchInvestments = useCallback(async () => {
    setLoadingInvm(true);
    try {
      const params = { page: invmPage, limit: 20 };
      if (invmStatus) params.status = invmStatus;
      const res = await adminAPI.getAllInvestorInvestments(params);
      setInvestments(res.data?.data?.investments || []);
      setInvmTotal(res.data?.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load investor investments'); }
    finally { setLoadingInvm(false); }
  }, [invmPage, invmStatus]);

  useEffect(() => { if (tab === 'investments') fetchInvestments(); }, [tab, fetchInvestments]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handlePlanChange = async (investorId, newPlan) => {
    try {
      await adminAPI.updateInvestorPlan(investorId, newPlan);
      toast.success(`Plan updated to Plan ${newPlan}`);
      fetchInvestors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    }
  };

  const handleToggle = async (investorId) => {
    try {
      await adminAPI.toggleInvestor(investorId);
      toast.success('Investor status updated');
      fetchInvestors();
    } catch { toast.error('Failed to toggle status'); }
  };

  const handleApproveInvestment = async (id) => {
    try {
      await adminAPI.approveInvestorInvestment(id);
      toast.success('Investment approved');
      fetchInvestments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectInvestment = async (id) => {
    const note = window.prompt('Rejection reason (optional):') || '';
    try {
      await adminAPI.rejectInvestorInvestment(id, note);
      toast.success('Investment rejected');
      fetchInvestments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  // ROI credit modal state
  const [roiModal, setRoiModal] = useState(null); // { investorId, investmentId }
  const [roiAmount, setRoiAmount] = useState('');
  const [submittingRoi, setSubmittingRoi] = useState(false);

  const handleCreditRoi = async () => {
    if (!roiAmount || isNaN(roiAmount) || Number(roiAmount) <= 0) {
      return toast.error('Enter a valid amount');
    }
    setSubmittingRoi(true);
    try {
      await adminAPI.creditInvestorRoi(roiModal.investorId, {
        investmentId: roiModal.investmentId,
        amount: Number(roiAmount)
      });
      toast.success('ROI credited');
      setRoiModal(null);
      setRoiAmount('');
      fetchInvestments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to credit ROI');
    } finally {
      setSubmittingRoi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Investor Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage investor accounts, plans, and investments</p>
        </div>
        <button onClick={() => tab === 'investors' ? fetchInvestors() : fetchInvestments()}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 px-3 py-2 rounded-xl transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl border border-white/8 w-fit"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        {['investors', 'investments'].map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                    tab === t ? 'bg-amber-500 text-dark-900' : 'text-gray-400 hover:text-white'
                  }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Investors list ─────────────────────────────────────────────────── */}
      {tab === 'investors' && (
        <div className="rounded-3xl border border-white/10 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.04)' }}>
          {/* Filters */}
          <div className="p-5 border-b border-white/8 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search name or email…" value={invSearch}
                     onChange={e => { setInvSearch(e.target.value); setInvPage(1); }}
                     className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 transition" />
            </div>
            <select value={invPlanFilter}
                    onChange={e => { setInvPlanFilter(e.target.value); setInvPage(1); }}
                    className="px-4 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 transition">
              <option value="" className="bg-dark-800 text-white">All Phases</option>
              <option value="A" className="bg-dark-800 text-white">Phase 1</option>
              <option value="B" className="bg-dark-800 text-white">Phase 2</option>
            </select>
            <span className="px-3 py-2.5 text-gray-400 text-sm">{invTotal} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-white/8">
                  {['Name', 'Email', 'Plan', 'Invested', 'ROI Earned', 'Wallet Capital', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingInv ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-500">Loading…</td></tr>
                ) : investors.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-500">No investors found.</td></tr>
                ) : investors.map(inv => (
                  <tr key={inv._id} className="hover:bg-white/2 transition">
                    <td className="px-5 py-4 text-white font-semibold">{inv.name}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{inv.email}</td>
                    <td className="px-5 py-4"><PlanBadge plan={inv.plan} /></td>
                    <td className="px-5 py-4 text-gray-300">${(inv.totalInvested || 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-emerald-400">${(inv.totalRoiEarned || 0).toFixed(4)}</td>
                    <td className="px-5 py-4 text-amber-400">${(inv.wallet?.capital || 0).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        inv.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>{inv.isActive ? 'Active' : 'Disabled'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Plan toggle */}
                        <select value={inv.plan}
                                onChange={e => handlePlanChange(inv._id, e.target.value)}
                                className="text-xs bg-dark-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer transition">
                          <option value="A" className="bg-dark-800 text-white">Phase 1</option>
                          <option value="B" className="bg-dark-800 text-white">Phase 2</option>
                        </select>
                        <button onClick={() => handleToggle(inv._id)}
                                className="text-xs border border-white/10 text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg transition">
                          {inv.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {invTotal > 20 && (
            <div className="p-4 border-t border-white/8 flex items-center justify-between">
              <button disabled={invPage === 1} onClick={() => setInvPage(p => p - 1)}
                      className="text-sm text-gray-400 hover:text-white disabled:opacity-40 transition">← Prev</button>
              <span className="text-gray-500 text-sm">Page {invPage}</span>
              <button disabled={investors.length < 20} onClick={() => setInvPage(p => p + 1)}
                      className="text-sm text-gray-400 hover:text-white disabled:opacity-40 transition">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Investments list ───────────────────────────────────────────────── */}
      {tab === 'investments' && (
        <div className="rounded-3xl border border-white/10 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.04)' }}>
          {/* Filters */}
          <div className="p-5 border-b border-white/8 flex flex-wrap gap-3">
            <select value={invmStatus}
                    onChange={e => { setInvmStatus(e.target.value); setInvmPage(1); }}
                    className="px-4 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 transition">
              <option value="" className="bg-dark-800 text-white">All Statuses</option>
              <option value="pending" className="bg-dark-800 text-white">Pending</option>
              <option value="active" className="bg-dark-800 text-white">Active</option>
              <option value="completed" className="bg-dark-800 text-white">Completed</option>
              <option value="rejected" className="bg-dark-800 text-white">Rejected</option>
            </select>
            <span className="px-3 py-2.5 text-gray-400 text-sm">{invmTotal} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-white/8">
                  {['Investor', 'Amount', 'Plan/Pkg', 'Rate', 'ROI Earned', 'Cap', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingInvm ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-500">Loading…</td></tr>
                ) : investments.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-500">No investments found.</td></tr>
                ) : investments.map(inv => (
                  <tr key={inv._id} className="hover:bg-white/2 transition">
                    <td className="px-5 py-4">
                      <p className="text-white font-semibold">{inv.investorId?.name || '—'}</p>
                      <p className="text-gray-500 text-xs">{inv.investorId?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-white font-bold">${(inv.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <PlanBadge plan={inv.plan} />
                      <span className="text-gray-500 text-xs ml-1">Pkg {inv.packageNumber}</span>
                    </td>
                    <td className="px-5 py-4 text-amber-400 font-semibold">
                      {inv.isMonthlyMode ? '8%–10%/mo' : `${((inv.dailyRate || 0) * 100).toFixed(2)}%/d`}
                    </td>
                    <td className="px-5 py-4 text-emerald-400">${(inv.totalRoiEarned || 0).toFixed(4)}</td>
                    <td className="px-5 py-4 text-gray-400">
                      ${(inv.incomeCap || 0).toFixed(2)}
                      {inv.capReached && <span className="ml-1 text-xs text-red-400">(capped)</span>}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inv.status === 'pending' && (
                          <>
                            <button onClick={() => handleApproveInvestment(inv._id)}
                                    className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1">
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button onClick={() => handleRejectInvestment(inv._id)}
                                    className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1">
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {inv.status === 'active' && !inv.capReached && (
                          <button onClick={() => setRoiModal({ investorId: inv.investorId?._id, investmentId: inv._id })}
                                  className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1">
                            <DollarSign size={12} /> Credit ROI
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invmTotal > 20 && (
            <div className="p-4 border-t border-white/8 flex items-center justify-between">
              <button disabled={invmPage === 1} onClick={() => setInvmPage(p => p - 1)}
                      className="text-sm text-gray-400 hover:text-white disabled:opacity-40 transition">← Prev</button>
              <span className="text-gray-500 text-sm">Page {invmPage}</span>
              <button disabled={investments.length < 20} onClick={() => setInvmPage(p => p + 1)}
                      className="text-sm text-gray-400 hover:text-white disabled:opacity-40 transition">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── ROI Credit Modal ───────────────────────────────────────────────── */}
      {roiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-3xl border border-white/10 p-6"
               style={{ background: '#0d1a2e' }}>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-amber-400" /> Credit ROI
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              Enter the ROI amount to credit. The 3× income cap will be automatically enforced.
            </p>
            <input type="number" min="0.01" step="0.01" value={roiAmount}
                   onChange={e => setRoiAmount(e.target.value)}
                   placeholder="Amount in USD"
                   className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={handleCreditRoi} disabled={submittingRoi}
                      className="flex-1 py-3 rounded-xl font-bold text-dark-900 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                {submittingRoi ? 'Crediting…' : 'Credit ROI'}
              </button>
              <button onClick={() => { setRoiModal(null); setRoiAmount(''); }}
                      className="flex-1 py-3 rounded-xl font-semibold text-gray-400 hover:text-white border border-white/10 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
