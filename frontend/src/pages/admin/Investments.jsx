import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, Clock, RefreshCw,
  AlertCircle, ChevronLeft, ChevronRight, ExternalLink,
  PiggyBank, ChevronDown, ChevronUp, Hash, FileText, MessageSquare,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const STATUS_STYLES = {
  pending:   'bg-amber-400/10  text-amber-400   border-amber-400/20',
  active:    'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  rejected:  'bg-red-400/10    text-red-400     border-red-400/20',
  cancelled: 'bg-gray-400/10   text-gray-400    border-gray-400/20',
  withdrawn: 'bg-blue-400/10   text-blue-400    border-blue-400/20',
  completed: 'bg-purple-400/10 text-purple-400  border-purple-400/20',
};

const ALL_STATUSES = ['', 'pending', 'active', 'rejected', 'cancelled', 'withdrawn', 'completed'];

// ─── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ investment, onClose, onConfirm, loading }) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-dark-500 bg-dark-800 p-6 shadow-2xl">
        <h3 className="font-semibold text-white mb-1">Reject Investment</h3>
        <p className="text-sm text-gray-400 mb-4">
          Rejecting <span className="text-white font-medium">{fmt(investment?.amount)}</span> from{' '}
          <span className="text-white font-medium">{investment?.userId?.name}</span>
        </p>
        <label className="block text-xs text-gray-400 mb-1.5">Reason for rejection (shown to user)</label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Payment proof not valid, transaction ID not found…"
          className="w-full rounded-xl bg-dark-700 border border-dark-500 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gold-400 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(note)} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {loading ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded payment proof detail row ────────────────────────────────────────
function ProofDetailRow({ inv }) {
  const hasProof = inv.paymentProof || inv.transactionId || inv.paymentNote;

  return (
    <tr>
      <td colSpan={8} className="px-4 py-0">
        <div className="mx-1 mb-3 rounded-xl border border-dark-500 bg-dark-900/60 p-5 grid sm:grid-cols-3 gap-5">

          {/* Transaction ID */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
              <Hash size={10} className="text-gold-400" /> Transaction ID / Ref
            </div>
            {inv.transactionId ? (
              <span className="font-mono text-sm text-white bg-dark-700 px-3 py-1.5 rounded-lg border border-dark-500 break-all block">
                {inv.transactionId}
              </span>
            ) : (
              <span className="text-gray-600 text-xs italic">Not provided</span>
            )}
          </div>

          {/* Payment Proof */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
              <FileText size={10} className="text-gold-400" /> Payment Proof
            </div>
            {inv.paymentProof ? (
              inv.paymentProof.startsWith('http') ? (
                <a
                  href={inv.paymentProof}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:underline break-all"
                >
                  View Proof <ExternalLink size={13} />
                </a>
              ) : (
                <span className="text-sm text-gray-300 break-all">{inv.paymentProof}</span>
              )
            ) : (
              <span className="text-gray-600 text-xs italic">No proof submitted</span>
            )}
          </div>

          {/* Note from user */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
              <MessageSquare size={10} className="text-gold-400" /> Note from User
            </div>
            {inv.paymentNote ? (
              <p className="text-sm text-gray-300 leading-relaxed">{inv.paymentNote}</p>
            ) : (
              <span className="text-gray-600 text-xs italic">No note</span>
            )}
          </div>

          {/* Admin note if already actioned */}
          {inv.adminNote && (
            <div className="sm:col-span-3 pt-3 border-t border-dark-600">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Admin Note</div>
              <p className="text-sm text-amber-300">{inv.adminNote}</p>
            </div>
          )}

          {!hasProof && (
            <div className="sm:col-span-3 text-center text-gray-600 text-xs py-2">
              No payment proof was submitted with this investment.
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Investments() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [investments, setInvestments]   = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [expandedId, setExpandedId]     = useState(null); // proof detail expand

  const statusFilter = searchParams.get('status') ?? 'pending';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, val);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getInvestments({
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      setInvestments(res.data?.data?.investments ?? []);
      setPagination(res.data?.data?.pagination ?? { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load investments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (inv) => {
    setActionLoading(inv._id);
    try {
      await adminAPI.approveInvestment(inv._id);
      toast.success(`Approved ${fmt(inv.amount)} for ${inv.userId?.name}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Approval failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleRejectConfirm = async (note) => {
    setActionLoading(rejectTarget._id);
    try {
      await adminAPI.rejectInvestment(rejectTarget._id, note);
      toast.success('Investment rejected');
      setRejectTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Rejection failed');
    } finally {
      setActionLoading('');
    }
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PiggyBank className="text-gold-400" size={24} /> Investments
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total records</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter('status', s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
              statusFilter === s
                ? 'bg-gold-400 text-dark-900 border-gold-400'
                : 'border-dark-500 text-gray-400 hover:text-white hover:border-gray-500'
            }`}>
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Hint for admin */}
      <p className="text-xs text-gray-500">
        Click the <ChevronDown size={11} className="inline" /> expand button on any row to view the full payment proof, transaction ID, and user note.
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-700/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Package</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Txn ID</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-dark-600 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : investments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                    No investments found{statusFilter ? ` with status "${statusFilter}"` : ''}.
                  </td>
                </tr>
              ) : (
                investments.flatMap((inv) => {
                  const isPending   = inv.status === 'pending';
                  const isActioning = actionLoading === inv._id;
                  const isExpanded  = expandedId === inv._id;

                  const rows = [
                    <tr key={inv._id}
                      className={`transition-colors ${isExpanded ? 'bg-dark-700/20' : 'hover:bg-dark-700/30'}`}>

                      {/* Expand toggle */}
                      <td className="px-3 py-3.5">
                        <button onClick={() => toggleExpand(inv._id)}
                          className="p-1 rounded-lg text-gray-500 hover:text-gold-400 transition-colors"
                          aria-label={isExpanded ? 'Collapse proof' : 'View proof'}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">{inv.userId?.name ?? '—'}</div>
                        <div className="text-xs text-gray-500">{inv.userId?.email ?? '—'}</div>
                      </td>

                      {/* Package */}
                      <td className="px-4 py-3.5">
                        <div className="text-gray-300">{inv.packageName}</div>
                        <div className="text-xs text-gray-500">{inv.dailyRate}% / day</div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right font-semibold text-gold-400 tabular-nums">
                        {fmt(inv.amount)}
                      </td>

                      {/* Transaction ID preview */}
                      <td className="px-4 py-3.5 max-w-[130px]">
                        {inv.transactionId ? (
                          <span className="font-mono text-xs text-gray-300 truncate block" title={inv.transactionId}>
                            {inv.transactionId}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 italic">None</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-gray-400 whitespace-nowrap text-xs">
                        {fmtDate(inv.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${STATUS_STYLES[inv.status] ?? 'text-gray-400'}`}>
                          {inv.status === 'pending'  && <Clock size={11} />}
                          {inv.status === 'active'   && <CheckCircle2 size={11} />}
                          {inv.status === 'rejected' && <XCircle size={11} />}
                          {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApprove(inv)} disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                              <CheckCircle2 size={13} />
                              {isActioning ? '…' : 'Approve'}
                            </button>
                            <button onClick={() => setRejectTarget(inv)} disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50">
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 capitalize">{inv.status}</span>
                        )}
                      </td>
                    </tr>,
                  ];

                  // Expanded proof detail row
                  if (isExpanded) {
                    rows.push(<ProofDetailRow key={`${inv._id}-proof`} inv={inv} />);
                  }

                  return rows;
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-600 text-sm text-gray-400">
            <span>Page {pagination.page} of {pagination.pages} · {pagination.total} records</span>
            <div className="flex gap-2">
              <button onClick={() => setFilter('page', String(page - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setFilter('page', String(page + 1))} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          investment={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          loading={actionLoading === rejectTarget._id}
        />
      )}
    </div>
  );
}
