import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, Clock, RefreshCw,
  AlertCircle, ChevronLeft, ChevronRight,
  ArrowUpRight, PackageCheck,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const STATUS_STYLES = {
  pending:    'bg-amber-400/10  text-amber-400   border-amber-400/20',
  approved:   'bg-blue-400/10   text-blue-400    border-blue-400/20',
  processing: 'bg-purple-400/10 text-purple-400  border-purple-400/20',
  completed:  'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  rejected:   'bg-red-400/10    text-red-400     border-red-400/20',
};

const TYPE_STYLES = {
  capital:    'text-gold-400',
  profit:     'text-emerald-400',
  commission: 'text-blue-400',
};

const ALL_STATUSES = ['', 'pending', 'approved', 'processing', 'completed', 'rejected'];

// ─── Action modal (shared for Reject + Note on approve/complete) ──────────────
function ActionModal({ title, description, confirmLabel, confirmClass, onClose, onConfirm, loading, showNote = true }) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-dark-500 bg-dark-800 p-6 shadow-2xl">
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{description}</p>
        {showNote && (
          <>
            <label className="block text-xs text-gray-400 mb-1.5">Admin note (optional)</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="w-full rounded-xl bg-dark-700 border border-dark-500 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gold-400 resize-none"
            />
          </>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Withdrawals() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Modal state: { type: 'approve'|'reject'|'complete', withdrawal }
  const [modal, setModal] = useState(null);

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
      const res = await adminAPI.getWithdrawals({
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      setWithdrawals(res.data?.data?.withdrawals ?? []);
      setPagination(res.data?.data?.pagination ?? { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── dispatch action ──
  const handleAction = async (note) => {
    const { type, withdrawal } = modal;
    setActionLoading(withdrawal._id);
    try {
      if (type === 'approve')   await adminAPI.approveWithdrawal(withdrawal._id, note);
      if (type === 'reject')    await adminAPI.rejectWithdrawal(withdrawal._id, note);
      if (type === 'complete')  await adminAPI.completeWithdrawal(withdrawal._id, note);

      const labels = { approve: 'approved', reject: 'rejected', complete: 'completed' };
      toast.success(`Withdrawal ${labels[type]} successfully`);
      setModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  const canApprove  = (w) => ['pending', 'processing'].includes(w.status);
  const canReject   = (w) => !['completed', 'rejected'].includes(w.status);
  const canComplete = (w) => ['pending', 'approved', 'processing'].includes(w.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowUpRight className="text-gold-400" size={24} />
            Withdrawals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total records</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter('status', s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
              statusFilter === s
                ? 'bg-gold-400 text-dark-900 border-gold-400'
                : 'border-dark-500 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
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

      {/* Table */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-700/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Wallet Address</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-dark-600 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    No withdrawals found{statusFilter ? ` with status "${statusFilter}"` : ''}.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-dark-700/30 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">{w.userId?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{w.userId?.email ?? '—'}</div>
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3.5 text-right font-semibold text-gold-400 tabular-nums">
                      {fmt(w.amount)}
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span className={`capitalize font-medium text-xs ${TYPE_STYLES[w.type] ?? 'text-gray-400'}`}>
                        {w.type}
                      </span>
                    </td>
                    {/* Wallet address */}
                    <td className="px-4 py-3.5 max-w-[140px]">
                      <span className="text-xs text-gray-400 font-mono truncate block">
                        {w.walletAddress || <span className="text-gray-600">—</span>}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3.5 text-gray-400 whitespace-nowrap text-xs">
                      {fmtDate(w.requestedAt)}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${STATUS_STYLES[w.status] ?? 'text-gray-400'}`}>
                        {w.status === 'pending'   && <Clock size={11} />}
                        {w.status === 'approved'  && <CheckCircle2 size={11} />}
                        {w.status === 'completed' && <PackageCheck size={11} />}
                        {w.status === 'rejected'  && <XCircle size={11} />}
                        {w.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {canApprove(w) && (
                          <button
                            onClick={() => setModal({ type: 'approve', withdrawal: w })}
                            disabled={actionLoading === w._id}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {canComplete(w) && (
                          <button
                            onClick={() => setModal({ type: 'complete', withdrawal: w })}
                            disabled={actionLoading === w._id}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
                        {canReject(w) && (
                          <button
                            onClick={() => setModal({ type: 'reject', withdrawal: w })}
                            disabled={actionLoading === w._id}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        {w.adminNote && (
                          <span title={w.adminNote} className="text-xs text-gray-600 cursor-help underline decoration-dotted">note</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-600 text-sm text-gray-400">
            <span>Page {pagination.page} of {pagination.pages} · {pagination.total} records</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('page', String(page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setFilter('page', String(page + 1))}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action modal */}
      {modal && (
        <ActionModal
          title={
            modal.type === 'approve'  ? 'Approve Withdrawal'  :
            modal.type === 'reject'   ? 'Reject Withdrawal'   :
            'Mark as Completed'
          }
          description={
            modal.type === 'reject'
              ? `Reject $${modal.withdrawal.amount} withdrawal from ${modal.withdrawal.userId?.name}? The amount will be refunded to their wallet.`
              : `Confirm ${modal.type} for $${modal.withdrawal.amount} (${modal.withdrawal.type}) withdrawal from ${modal.withdrawal.userId?.name}?`
          }
          confirmLabel={
            modal.type === 'approve'  ? 'Approve'        :
            modal.type === 'reject'   ? 'Reject & Refund':
            'Mark Completed'
          }
          confirmClass={
            modal.type === 'approve'  ? 'bg-blue-500 hover:bg-blue-400 text-white'    :
            modal.type === 'reject'   ? 'bg-red-500  hover:bg-red-400  text-white'    :
            'bg-emerald-500 hover:bg-emerald-400 text-white'
          }
          onClose={() => setModal(null)}
          onConfirm={handleAction}
          loading={actionLoading === modal.withdrawal._id}
        />
      )}
    </div>
  );
}
