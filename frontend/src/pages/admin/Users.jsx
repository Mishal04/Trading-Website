import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users as UsersIcon, Search, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Wallet,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

// ─── Expanded user detail row ─────────────────────────────────────────────────
function UserDetail({ user }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-4 bg-dark-700/40 border-b border-dark-600">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Wallet */}
          <div className="rounded-xl border border-dark-500 bg-dark-800/60 p-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">
              <Wallet size={12} /> Wallet Balances
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-400">Capital</span><span className="font-semibold text-gold-400">{fmt(user.wallet?.capital)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Profit</span><span className="font-semibold text-emerald-400">{fmt(user.wallet?.profit)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Commission</span><span className="font-semibold text-blue-400">{fmt(user.wallet?.commission)}</span></div>
            </div>
          </div>
          {/* Investment */}
          <div className="rounded-xl border border-dark-500 bg-dark-800/60 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Investment</div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-400">Total Invested</span><span className="font-semibold text-white">{fmt(user.totalInvestment)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Level</span><span className="font-semibold text-gold-400 capitalize">{user.investmentLevel ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total Profit</span><span className="font-semibold text-emerald-400">{fmt(user.totalProfitEarned)}</span></div>
            </div>
          </div>
          {/* Team */}
          <div className="rounded-xl border border-dark-500 bg-dark-800/60 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Team Business</div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-400">Total</span><span className="font-semibold text-white">{fmt(user.teamBusiness?.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Direct Referrals</span><span className="font-semibold text-white">{user.referrals?.count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Active Referrals</span><span className="font-semibold text-white">{user.referrals?.activeCount ?? 0}</span></div>
            </div>
          </div>
          {/* Account */}
          <div className="rounded-xl border border-dark-500 bg-dark-800/60 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Account</div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-400">Referral Code</span><span className="font-mono text-xs text-white">{user.referralCode}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Verified</span><span>{user.isVerified ? <span className="text-emerald-400 text-xs">Yes</span> : <span className="text-red-400 text-xs">No</span>}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Joined</span><span className="text-xs text-white">{fmtDate(user.createdAt)}</span></div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers]             = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [expandedId, setExpandedId]   = useState(null);

  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const searchTimer           = useRef(null);

  const fetchData = useCallback(async (q = search, p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getUsers({ search: q || undefined, page: p, limit: 15 });
      setUsers(res.data?.data?.users ?? []);
      setPagination(res.data?.data?.pagination ?? { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchData(); }, [page]);  // page changes trigger immediately

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchData(val, 1);
    }, 400);
  };

  const handleToggle = async (user) => {
    setActionLoading(user._id);
    try {
      await adminAPI.toggleUser(user._id);
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UsersIcon className="text-gold-400" size={24} />
            Users
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total users</p>
        </div>
        <button onClick={() => fetchData()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search name, email, referral code…"
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
                <th className="px-4 py-3 text-left">Referral Code</th>
                <th className="px-4 py-3 text-right">Total Invested</th>
                <th className="px-4 py-3 text-right">Wallet Capital</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-dark-600 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    No users found{search ? ` matching "${search}"` : ''}.
                  </td>
                </tr>
              ) : (
                users.flatMap((u) => {
                  const isExpanded = expandedId === u._id;
                  const isActioning = actionLoading === u._id;
                  const rows = [
                    <tr
                      key={u._id}
                      className={`hover:bg-dark-700/30 transition-colors ${isExpanded ? 'bg-dark-700/20' : ''}`}
                    >
                      {/* Expand toggle */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : u._id)}
                          className="p-1 rounded-lg text-gray-500 hover:text-gold-400 transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      {/* Name / email */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      {/* Referral code */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-md">
                          {u.referralCode}
                        </span>
                      </td>
                      {/* Total invested */}
                      <td className="px-4 py-3.5 text-right font-semibold text-white tabular-nums">
                        {fmt(u.totalInvestment)}
                      </td>
                      {/* Wallet capital */}
                      <td className="px-4 py-3.5 text-right font-semibold text-gold-400 tabular-nums">
                        {fmt(u.wallet?.capital)}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          u.isActive
                            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                            : 'bg-red-400/10 text-red-400 border-red-400/20'
                        }`}>
                          {u.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggle(u)}
                          disabled={isActioning}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                            u.isActive
                              ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                          }`}
                        >
                          {isActioning ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ];
                  if (isExpanded) rows.push(<UserDetail key={`${u._id}-detail`} user={u} />);
                  return rows;
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-600 text-sm text-gray-400">
            <span>Page {pagination.page} of {pagination.pages} · {pagination.total} users</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg border border-dark-500 hover:border-gold-400 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
