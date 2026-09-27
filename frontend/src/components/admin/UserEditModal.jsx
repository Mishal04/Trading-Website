import { useState, useEffect } from 'react';
import { adminAPI, withdrawalAPI } from '../../services/api';
import toast from 'react-hot-toast';
import TransactionErrorBoundary from './TransactionErrorBoundary';
import {
  X, Save, Mail, Phone, Building2, Plus,
  ArrowDownUp, Eye, EyeOff, Loader, AlertTriangle,
} from 'lucide-react';

const fmt = (n = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function UserEditModal({ user, isOpen, onClose, onSaved }) {
  const [tab, setTab] = useState('login'); // login, payment, edit, transactions
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [latestCryptoAddress, setLatestCryptoAddress] = useState(null);

  // Edit form state
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    bankDetails: {
      accountName: user?.bankDetails?.accountName || '',
      accountNumber: user?.bankDetails?.accountNumber || '',
      bankName: user?.bankDetails?.bankName || '',
      ifscCode: user?.bankDetails?.ifscCode || '',
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        bankDetails: {
          accountName: user.bankDetails?.accountName || '',
          accountNumber: user.bankDetails?.accountNumber || '',
          bankName: user.bankDetails?.bankName || '',
          ifscCode: user.bankDetails?.ifscCode || '',
        },
      });
      
      // Fetch latest crypto address
      fetchLatestCryptoAddress();
    }
  }, [user, isOpen]);

  // Fetch transactions when tab changes
  useEffect(() => {
    if (isOpen && tab === 'transactions' && user?._id && transactions.length === 0) {
      fetchTransactions();
    }
  }, [tab, isOpen]);

  const fetchLatestCryptoAddress = async () => {
    if (!user?._id) return;
    try {
      // Fetch user's latest withdrawals to get the most recent crypto address
      const res = await withdrawalAPI.getHistory({ userId: user._id, limit: 100 });
      const withdrawals = res.data?.data?.withdrawals || [];
      
      // Find the latest withdrawal with a walletAddress
      const latestWithdrawal = withdrawals.find(w => w.walletAddress);
      if (latestWithdrawal) {
        setLatestCryptoAddress(latestWithdrawal.walletAddress);
      }
    } catch (err) {
      // Silent fail - crypto address is optional
    }
  };

  const fetchTransactions = async () => {
    if (!user?._id) return;
    setTransLoading(true);
    setTransError(null);
    try {
      const res = await adminAPI.getUserTransactions(user._id, { limit: 100 });
      
      // Defensive check: ensure we have an array
      const txnArray = Array.isArray(res.data?.data?.transactions) ? res.data.data.transactions : [];
      setTransactions(txnArray);
    } catch (err) {
      setTransError(err.response?.data?.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setTransLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        bankDetails: {
          accountName: form.bankDetails.accountName.trim() || null,
          accountNumber: form.bankDetails.accountNumber.trim() || null,
          bankName: form.bankDetails.bankName.trim() || null,
          ifscCode: form.bankDetails.ifscCode.toUpperCase().trim() || null,
        },
      };

      await adminAPI.updateUser(user._id, payload);
      toast.success('User profile updated successfully');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 border border-dark-500 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <div>
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-dark-600 bg-dark-700/30 flex-wrap">
          {[
            { id: 'login', label: 'Login Info' },
            { id: 'payment', label: 'Payment Details' },
            { id: 'edit', label: 'Edit Profile' },
            { id: 'transactions', label: 'Transactions' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Login Info Tab */}
          {tab === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Email (Editable)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1">Change email address if user entered it incorrectly at signup</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Password</label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-700 border border-dark-600">
                  <span className="text-gray-400 text-sm flex-1">••••••••</span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-lg text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Password is hashed and cannot be displayed. To reset, use the "Send Password Reset Email" feature.
                </p>
              </div>

              <div className="pt-2">
                <button className="w-full px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-sm text-gray-400 hover:text-white hover:border-gold-400 transition-colors">
                  Send Password Reset Email
                </button>
              </div>
            </div>
          )}

          {/* Payment Details Tab */}
          {tab === 'payment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                    <Phone size={12} className="inline mr-1" /> Phone Number
                  </label>
                  <p className="text-sm text-gray-300 p-3 rounded-lg bg-dark-700 border border-dark-600">
                    {user.phoneNumber || '—'}
                  </p>
                </div>

                <div className="border-t border-dark-600 pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Building2 size={14} /> Crypto Wallet
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">Latest crypto wallet address used in withdrawals:</p>
                  <div className="p-3 rounded-lg bg-dark-700 border border-dark-600">
                    {latestCryptoAddress ? (
                      <p className="text-xs text-gray-300 font-mono break-all">{latestCryptoAddress}</p>
                    ) : (
                      <p className="text-xs text-gray-500">No withdrawal history yet</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-dark-600 pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Building2 size={14} /> Bank Details
                  </h3>
                  {user.bankDetails?.accountName ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Account Name</p>
                        <p className="text-gray-300">{user.bankDetails.accountName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Account Number</p>
                        <p className="text-gray-300 font-mono">{user.bankDetails.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bank Name</p>
                        <p className="text-gray-300">{user.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">IFSC Code</p>
                        <p className="text-gray-300 font-mono">{user.bankDetails.ifscCode}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No bank details on file</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Profile Tab */}
          {tab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g., +1 (555) 123-4567"
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                />
              </div>

              <div className="border-t border-dark-600 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Bank Details</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Account Name"
                    value={form.bankDetails.accountName}
                    onChange={(e) => setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, accountName: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={form.bankDetails.accountNumber}
                    onChange={(e) => setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, accountNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={form.bankDetails.bankName}
                    onChange={(e) => setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, bankName: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors text-sm"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={form.bankDetails.ifscCode}
                    onChange={(e) => setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, ifscCode: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {tab === 'transactions' && (
            <TransactionErrorBoundary>
              <div className="space-y-4">
                {transError && (
                  <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>Error loading transactions: {transError}</span>
                  </div>
                )}
                {transLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader size={20} className="animate-spin text-gold-400" />
                  </div>
                ) : !Array.isArray(transactions) || transactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.map((txn, idx) => {
                      // Defensive: ensure txn has required fields
                      if (!txn || typeof txn !== 'object') {
                        console.warn('Invalid transaction object at index', idx, txn);
                        return null;
                      }
                      
                      try {
                        const txnType = txn.type || 'unknown';
                        const txnAmount = typeof txn.amount === 'number' ? txn.amount : 0;
                        const txnStatus = txn.status || 'pending';
                        const txnDescription = txn.description || 'Transaction';
                        const txnDate = txn.createdAt || txn.date || new Date().toISOString();
                        const txnId = txn._id || `txn-${idx}`;

                        return (
                          <div key={txnId} className="p-3 rounded-lg bg-dark-700 border border-dark-600 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-white capitalize">{txnType}</span>
                              <span className={`font-semibold ${
                                txnAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {txnAmount >= 0 ? '+' : ''}{fmt(txnAmount)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{txnDescription}</p>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span className="capitalize">{txnStatus}</span>
                              <span>{fmtDate(txnDate)}</span>
                            </div>
                          </div>
                        );
                      } catch (err) {
                        console.error('Error rendering transaction:', err, txn);
                        return (
                          <div key={`txn-error-${idx}`} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            Failed to render transaction (index: {idx})
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </TransactionErrorBoundary>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-600 bg-dark-700/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          {(tab === 'edit' || tab === 'login') && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400/20 border border-gold-400/30 text-gold-400 text-sm font-semibold hover:bg-gold-400/30 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
