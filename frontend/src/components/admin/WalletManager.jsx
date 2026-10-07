import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Check, X, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WalletManager() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    network: 'Bitcoin',
    label: '',
    notes: ''
  });

  // Fetch wallets on mount
  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllWallets();
      setWallets(res.data?.data?.wallets || []);
    } catch (err) {
      toast.error('Failed to fetch wallets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    
    if (!formData.address || !formData.network || !formData.label) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.createWallet(formData);
      toast.success('Wallet created successfully');
      setFormData({ address: '', network: 'Bitcoin', label: '', notes: '' });
      setShowForm(false);
      await fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (walletId) => {
    setLoading(true);
    try {
      await adminAPI.setCurrentWallet(walletId);
      toast.success('Wallet set as current');
      await fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async (walletId) => {
    if (!confirm('Are you sure you want to archive this wallet?')) return;

    setLoading(true);
    try {
      await adminAPI.deleteWallet(walletId);
      toast.success('Wallet archived');
      await fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied!');
  };

  const currentWallet = wallets.find(w => w.isCurrent);
  const activeWallets = wallets.filter(w => w.isActive && !w.isCurrent);
  const inactiveWallets = wallets.filter(w => !w.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Crypto Wallets</h2>
          <p className="text-sm text-gray-400 mt-1">Manage deposit wallet addresses for clients</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500/30 transition-colors"
        >
          <Plus size={18} /> Add Wallet
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border border-dark-500 bg-dark-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Wallet</h3>
          
          <form onSubmit={handleCreateWallet} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Main Wallet, Backup 2"
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Network *</label>
                <select
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white focus:outline-none focus:border-gold-400"
                >
                  <option value="Bitcoin">Bitcoin</option>
                  <option value="Ethereum">Ethereum</option>
                  <option value="USDT-BSC">USDT (BSC)</option>
                  <option value="USDT-TRC20">USDT (TRC20)</option>
                  <option value="BNB">BNB</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-2">Wallet Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Paste wallet address here"
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., Valid until 2026-10-15"
                rows="2"
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500/30 disabled:opacity-50 transition-colors font-semibold"
              >
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Wallet (Highlighted) */}
      {currentWallet && (
        <div className="rounded-lg border-2 border-gold-500/50 bg-gold-500/10 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-gold-400" />
              <div>
                <h3 className="text-lg font-bold text-gold-400">Current Active Wallet</h3>
                <p className="text-xs text-gold-300/70">Clients see this wallet for deposits</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-300 text-xs font-semibold">
              ACTIVE
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">Label</p>
              <p className="text-white font-semibold">{currentWallet.label}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Network</p>
                <p className="text-white">{currentWallet.network}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Activated</p>
                <p className="text-white">{new Date(currentWallet.activatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-semibold mb-2">Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-gold-400 text-xs overflow-x-auto font-mono">
                  {currentWallet.address}
                </code>
                <button
                  onClick={() => handleCopyAddress(currentWallet.address)}
                  className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                  title="Copy address"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {currentWallet.notes && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Notes</p>
                <p className="text-sm text-gray-300">{currentWallet.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Active Wallets */}
      {activeWallets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Other Active Wallets</h3>
          
          {activeWallets.map((wallet) => (
            <div key={wallet._id} className="rounded-lg border border-dark-500 bg-dark-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-white">{wallet.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{wallet.network}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetCurrent(wallet._id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-xs font-semibold transition-colors"
                    title="Set as current"
                  >
                    <Check size={14} className="inline mr-1" /> Set Current
                  </button>
                  <button
                    onClick={() => handleDeleteWallet(wallet._id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-colors"
                    title="Archive wallet"
                  >
                    <Trash2 size={14} className="inline mr-1" /> Archive
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-gray-400 text-xs overflow-x-auto font-mono">
                  {wallet.address}
                </code>
                <button
                  onClick={() => handleCopyAddress(wallet.address)}
                  className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                  title="Copy address"
                >
                  <Copy size={16} />
                </button>
              </div>

              {wallet.notes && (
                <p className="text-xs text-gray-500 italic">{wallet.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inactive Wallets */}
      {inactiveWallets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Archived Wallets</h3>
          
          <div className="rounded-lg border border-dark-500 bg-dark-700/30 p-4">
            <p className="text-sm text-gray-500">{inactiveWallets.length} archived wallet(s)</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {wallets.length === 0 && !showForm && (
        <div className="rounded-lg border border-dark-500 bg-dark-800 p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-gray-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No Wallets Configured</h3>
          <p className="text-sm text-gray-400 mb-4">Create your first wallet to enable client deposits</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500/30 transition-colors font-semibold"
          >
            Create First Wallet
          </button>
        </div>
      )}
    </div>
  );
}
