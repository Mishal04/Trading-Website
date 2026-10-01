import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import TransactionErrorBoundary from './TransactionErrorBoundary';
import {
  X, Save, Mail, Phone, Building2, Plus,
  ArrowDownUp, Eye, EyeOff, Loader, AlertTriangle, CheckCircle2, LogIn,
} from 'lucide-react';

const fmt = (n = 0) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  } catch (err) {
    return `$${Number(n).toFixed(2)}`;
  }
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    
    // Use more compatible date formatting
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (err) {
    return '—';
  }
};

export default function UserEditModal({ user, isOpen, onClose, onSaved }) {
  const [tab, setTab] = useState('login'); // login, payment, edit, transactions
  const [loading, setLoading] = useState(false);
  const [freshUser, setFreshUser] = useState(null);  // Store freshly fetched user data
  const [transactions, setTransactions] = useState([]);
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [latestCryptoAddress, setLatestCryptoAddress] = useState(null);

  // Edit form state
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    phoneNumber: user?.phoneNumber || '',
    walletAddress: user?.walletAddress || '',
    bankDetails: {
      accountName: user?.bankDetails?.accountName || '',
      accountNumber: user?.bankDetails?.accountNumber || '',
      bankName: user?.bankDetails?.bankName || '',
      ifscCode: user?.bankDetails?.ifscCode || '',
    },
  });

  // Fetch fresh user data when modal opens
  const fetchFreshUserData = async () => {
    if (!user?._id) return;
    try {
      const res = await adminAPI.getUsers({ limit: 100 });  // Fetch all to find this user
      const updatedUser = res.data?.data?.users?.find(u => u._id === user._id);
      if (updatedUser) {
        setFreshUser(updatedUser);
        // Update form with fresh data
        setForm({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          password: '',
          confirmPassword: '',
          phoneNumber: updatedUser.phoneNumber || '',
          walletAddress: updatedUser.walletAddress || '',
          bankDetails: {
            accountName: updatedUser.bankDetails?.accountName || '',
            accountNumber: updatedUser.bankDetails?.accountNumber || '',
            bankName: updatedUser.bankDetails?.bankName || '',
            ifscCode: updatedUser.bankDetails?.ifscCode || '',
          },
        });
      }
    } catch (err) {
      // Silent fail - use original user data if fetch fails
      console.error('Error fetching fresh user data:', err);
    }
  };

  // Fetch user's payment info (wallet address from withdrawals, TXN ID from investments)
  const fetchUserPaymentInfo = async () => {
    if (!user?._id) return;
    try {
      console.log('🔍 [fetchUserPaymentInfo] Fetching payment info for user:', user._id);
      const res = await adminAPI.getUserPaymentInfo(user._id);
      console.log('✅ [fetchUserPaymentInfo] Response:', res.data?.data);
      
      const paymentInfo = res.data?.data;
      if (!paymentInfo) {
        console.log('⚠️ [fetchUserPaymentInfo] No payment info returned');
        return;
      }

      // Display reference address
      if (paymentInfo.latestWithdrawalAddress) {
        console.log('💰 [fetchUserPaymentInfo] Setting latestCryptoAddress to:', paymentInfo.latestWithdrawalAddress);
        setLatestCryptoAddress(paymentInfo.latestWithdrawalAddress);
        
        // IMMEDIATELY update form with the wallet address
        console.log('📝 [fetchUserPaymentInfo] Updating form.walletAddress to:', paymentInfo.latestWithdrawalAddress);
        setForm(prevForm => {
          const newForm = {
            ...prevForm,
            walletAddress: paymentInfo.latestWithdrawalAddress
          };
          console.log('✅ [fetchUserPaymentInfo] Form updated:', newForm.walletAddress);
          return newForm;
        });
      } else {
        console.log('⚠️ [fetchUserPaymentInfo] No latest withdrawal address found');
      }
    } catch (err) {
      console.error('❌ [fetchUserPaymentInfo] Error:', err);
    }
  };

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      console.log('📋 UserEditModal opened for:', user.name, user._id);
      // First set with the passed user data
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        phoneNumber: user.phoneNumber || '',
        walletAddress: user.walletAddress || '',
        bankDetails: {
          accountName: user.bankDetails?.accountName || '',
          accountNumber: user.bankDetails?.accountNumber || '',
          bankName: user.bankDetails?.bankName || '',
          ifscCode: user.bankDetails?.ifscCode || '',
        },
      });
      
      // Then fetch fresh data to ensure we have the latest
      fetchFreshUserData();
      
      // Fetch latest payment info (wallet address, transaction IDs, bank details)
      fetchUserPaymentInfo();
    }
  }, [user, isOpen]);

  // Fetch transactions when tab changes
  useEffect(() => {
    if (isOpen && tab === 'transactions' && user?._id && transactions.length === 0) {
      fetchTransactions();
    }
  }, [tab, isOpen]);

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
    
    // Validate password if provided
    if (form.password.trim() || form.confirmPassword.trim()) {
      if (form.password.trim() !== form.confirmPassword.trim()) {
        toast.error('Passwords do not match');
        return;
      }
      if (form.password.trim().length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        walletAddress: form.walletAddress.trim() || null,
        bankDetails: {
          accountName: form.bankDetails.accountName.trim() || null,
          accountNumber: form.bankDetails.accountNumber.trim() || null,
          bankName: form.bankDetails.bankName.trim() || null,
          ifscCode: form.bankDetails.ifscCode.toUpperCase().trim() || null,
        },
      };

      // Include password only if it was provided
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

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

  const handleLoginAsUser = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const res = await adminAPI.generateImpersonationToken(user._id);
      
      // Store the impersonation token
      const impersonationToken = res.data?.data?.token;
      localStorage.setItem('token', impersonationToken);
      localStorage.setItem('user', JSON.stringify(res.data?.data?.user));
      
      toast.success(`Logged in as ${user.name}`);
      
      // Redirect to user dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate impersonation token');
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoginAsUser}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              title="Login as this user temporarily (30 min session)"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <LogIn size={14} />}
              Login as User
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
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

              <div className="border-t border-dark-600 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Eye size={14} /> Password (Editable)
                </h3>
                <p className="text-xs text-gray-500 mb-3">Leave password fields empty to keep current password unchanged. To set a new password, enter it in both fields below.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 font-semibold mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Leave empty to keep current password"
                      className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                    />
                    <p className="text-xs text-gray-600 mt-1">Minimum 6 characters</p>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 font-semibold mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                    />
                  </div>

                  {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                    <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Passwords do not match</span>
                    </div>
                  )}

                  {form.password && form.password.length < 6 && (
                    <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Password must be at least 6 characters</span>
                    </div>
                  )}

                  {form.password && form.password === form.confirmPassword && form.password.length >= 6 && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      <span>Passwords match and are valid</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Details Tab */}
          {tab === 'payment' && (
            <div className="space-y-4">
              {/* Phone Number - Editable */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  <Phone size={12} className="inline mr-1" /> Phone Number (Editable)
                </label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g., +1 (555) 123-4567"
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1">User's phone number for contact purposes</p>
              </div>

              {/* Crypto Wallet */}
              <div className="border-t border-dark-600 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Building2 size={14} /> Crypto Wallet (Editable)
                </h3>
                <input
                  type="text"
                  value={form.walletAddress}
                  onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                  placeholder="e.g., 1A1z7agoat2Bt89ZN0QCnEQxKucbS1..."
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors font-mono text-xs mb-2"
                />
                <p className="text-xs text-gray-600 mb-2">
                  Bitcoin or crypto wallet address for withdrawals. Auto-populated with latest address from user's withdrawal requests.
                </p>
                {latestCryptoAddress && (
                  <p className="text-xs text-gray-500 p-2 rounded-lg bg-dark-700 border border-dark-600">
                    Last withdrawal address: <span className="text-gray-300 font-mono break-all">{latestCryptoAddress}</span>
                  </p>
                )}
              </div>

              {/* Bank Details */}
              <div className="border-t border-dark-600 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Building2 size={14} /> Bank Details
                </h3>
                {user.bankDetails?.accountName ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-dark-700 border border-dark-600 p-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-semibold">Account Name</p>
                        <p className="text-sm text-gray-300">{user.bankDetails.accountName}</p>
                      </div>
                      <div className="rounded-lg bg-dark-700 border border-dark-600 p-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-semibold">Account Number</p>
                        <p className="text-sm text-gray-300 font-mono">{user.bankDetails.accountNumber}</p>
                      </div>
                      <div className="rounded-lg bg-dark-700 border border-dark-600 p-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-semibold">Bank Name</p>
                        <p className="text-sm text-gray-300">{user.bankDetails.bankName}</p>
                      </div>
                      <div className="rounded-lg bg-dark-700 border border-dark-600 p-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-semibold">IFSC Code</p>
                        <p className="text-sm text-gray-300 font-mono">{user.bankDetails.ifscCode}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      To edit bank details, use the <span className="text-gold-400 font-semibold">Edit Profile</span> tab.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-dark-700 border border-dark-600 p-3 text-center">
                    <p className="text-xs text-gray-500 italic">No bank details on file</p>
                    <p className="text-xs text-gray-600 mt-2">
                      Bank details can be added in the <span className="text-gold-400 font-semibold">Edit Profile</span> tab.
                    </p>
                  </div>
                )}
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

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Crypto Wallet Address</label>
                <input
                  type="text"
                  value={form.walletAddress}
                  onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                  placeholder="e.g., 1A1z7agoat2Bt89ZN0QCnEQxKucbS1..."
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors font-mono text-sm"
                />
                <p className="text-xs text-gray-600 mt-1">Bitcoin or crypto wallet address for withdrawals</p>
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

                        // Test formatting functions
                        const formattedAmount = fmt(txnAmount);
                        const formattedDate = fmtDate(txnDate);

                        return (
                          <div key={txnId} className="p-3 rounded-lg bg-dark-700 border border-dark-600 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-white capitalize">{txnType}</span>
                              <span className={`font-bold text-lg ${
                                txnAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {txnAmount >= 0 ? '+' : ''}{formattedAmount}
                              </span>
                            </div>
                            {/* TXN ID */}
                            <div className="mb-2 p-2 rounded-lg bg-dark-800/60 border border-dark-500">
                              <p className="text-xs text-gray-500 font-semibold mb-0.5">TXN ID</p>
                              <p className="font-mono text-xs text-gold-400 break-all">{txnId}</p>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{txnDescription}</p>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span className="capitalize">{txnStatus}</span>
                              <span>{formattedDate}</span>
                            </div>
                          </div>
                        );
                      } catch (err) {
                        console.error('❌ Error rendering transaction at index', idx);
                        console.error('  Transaction object:', txn);
                        console.error('  Error type:', err.name);
                        console.error('  Error message:', err.message);
                        console.error('  Error stack:', err.stack);
                        
                        // Also try to show which field caused the issue
                        try {
                          console.error('  txn.type:', txn.type, 'type:', typeof txn.type);
                          console.error('  txn.amount:', txn.amount, 'type:', typeof txn.amount);
                          console.error('  txn.status:', txn.status, 'type:', typeof txn.status);
                          console.error('  txn.description:', txn.description, 'type:', typeof txn.description);
                          console.error('  txn.createdAt:', txn.createdAt, 'type:', typeof txn.createdAt);
                          console.error('  txn.date:', txn.date, 'type:', typeof txn.date);
                          console.error('  txn._id:', txn._id, 'type:', typeof txn._id);
                        } catch (e) {}
                        
                        return (
                          <div key={`txn-error-${idx}`} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            <div className="font-semibold mb-1">Failed to render transaction {idx}</div>
                            <div className="text-red-400/80">{err.name}: {err.message}</div>
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
          {(tab === 'edit' || tab === 'login' || tab === 'payment') && (
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
