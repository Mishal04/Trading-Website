import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, RefreshCw, AlertCircle, Plus, Minus, X,
  DollarSign, Wallet, ArrowDownLeft, ArrowUpRight,
  ChevronDown, ChevronUp, Loader, Send
} from 'lucide-react';

const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminUserTransactions() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Deposit/Withdraw modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('deposit'); // 'deposit' or 'withdraw'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    walletType: 'capital',
    amount: '',
    note: ''
  });

  const fetchUsers = useCallback(async (q = search, p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getUsers({ search: q || undefined, page: p, limit: 20 });
      setUsers(res.data?.data?.users ?? []);
      setPagination(res.data?.data?.pagination ?? { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const openDepositModal = (user) => {
    setSelectedUser(user);
    setModalMode('deposit');
    setFormData({ walletType: 'capital', amount: '', note: '' });
    setModalOpen(true);
  };

  const openWithdrawModal = (user) => {
    setSelectedUser(user);
    setModalMode('withdraw');
    setFormData({ walletType: 'capital', amount: '', note: '' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedUser || !formData.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setActionLoading(modalMode);
    try {
      if (modalMode === 'deposit') {
        const res = await adminAPI.depositToUser(selectedUser._id, {
          walletType: formData.walletType,
          amount,
          note: formData.note
        });
        toast.success(res.data?.message || 'Deposit successful');
      } else {
        const res = await adminAPI.withdrawFromUser(selectedUser._id, {
          walletType: formData.walletType,
          amount,
          note: formData.note
        });
        toast.success(res.data?.message || 'Withdrawal successful');
      }
      
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Transaction failed');
    } finally {
      setActionLoading('');
    }
  };

  const walletTypes = [
    { value: 'capital', label: 'Capital', color: 'gold-400' },
    { value: 'profit', label: 'Profit', color: 'emerald-400' },
    { value: 'commission', label: 'Commission', color: 'blue-400' },
    { value: 'roi', label: 'ROI', color: 'purple-400' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-gold-400" size={24} />
            User Wallet Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Deposit or withdraw funds from user wallets</p>
        </div>
        <button
          onClick={() => fetchUsers()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
        />
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
                <th className="px-4 py-3 text-left w-8" />
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-right">Capital</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">ROI</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {loading ? (
                Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array(8)
                        .fill(0)
                        .map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-dark-600 rounded w-24" />
                          </td>
                        ))}
                    </tr>
                  ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                    No users found{search ? ` matching "${search}"` : ''}.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-dark-700/30 transition-colors"
                  >
                    {/* Expand toggle */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setExpandedId(expandedId === user._id ? null : user._id)}
                        className="p-1 rounded-lg text-gray-500 hover:text-gold-400 transition-colors"
                      >
                        {expandedId === user._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    {/* Name / email */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    {/* Phone */}
                    <td className="px-4 py-3.5">
                      <span className="text-white text-sm">{user.phoneNumber || '—'}</span>
                    </td>
                    {/* Capital */}
                    <td className="px-4 py-3.5 text-right font-semibold text-gold-400 tabular-nums">
                      {fmt(user.wallet?.capital)}
                    </td>
                    {/* Profit */}
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-400 tabular-nums">
                      {fmt(user.wallet?.profit)}
                    </td>
                    {/* Commission */}
                    <td className="px-4 py-3.5 text-right font-semibold text-blue-400 tabular-nums">
                      {fmt(user.wallet?.commission)}
                    </td>
                    {/* ROI */}
                    <td className="px-4 py-3.5 text-right font-semibold text-purple-400 tabular-nums">
                      {fmt(user.wallet?.roi)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDepositModal(user)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center gap-1"
                          title="Deposit funds"
                        >
                          <Plus size={12} /> Deposit
                        </button>
                        <button
                          onClick={() => openWithdrawModal(user)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors flex items-center gap-1"
                          title="Withdraw funds"
                        >
                          <Minus size={12} /> Withdraw
                        </button>
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
            <span>
              Page {pagination.page} of {pagination.pages} · {pagination.total} users
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deposit/Withdraw Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-dark-500 rounded-2xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {modalMode === 'deposit' ? (
                  <>
                    <ArrowDownLeft className="text-emerald-400" size={20} /> Deposit to {selectedUser?.name}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="text-red-400" size={20} /> Withdraw from {selectedUser?.name}
                  </>
                )}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Wallet Type */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  <Wallet size={12} className="inline mr-1" /> Wallet Type
                </label>
                <select
                  value={formData.walletType}
                  onChange={(e) => setFormData({ ...formData, walletType: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white focus:outline-none focus:border-gold-400 transition-colors text-sm"
                >
                  {walletTypes.map((wt) => (
                    <option key={wt.value} value={wt.value}>
                      {wt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  <DollarSign size={12} className="inline mr-1" /> Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors text-sm"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Reason for this transaction…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors text-sm resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  modalMode === 'deposit'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                } disabled:opacity-50`}
              >
                {actionLoading ? (
                  <>
                    <Loader size={14} className="animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Send size={14} /> {modalMode === 'deposit' ? 'Deposit' : 'Withdraw'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
