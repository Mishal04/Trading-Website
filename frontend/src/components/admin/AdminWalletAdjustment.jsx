import { useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Minus, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminWalletAdjustment({ user, onAdjustmentComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState('deposit'); // 'deposit' or 'withdraw'
  const [walletType, setWalletType] = useState('capital'); // 'capital', 'profit', 'commission', 'roi'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      const endpoint = action === 'deposit' 
        ? adminAPI.depositWallet 
        : adminAPI.withdrawWallet;

      await endpoint(user._id, {
        amount: Number(amount),
        type: walletType,
        reason: reason.trim()
      });

      toast.success(
        `Successfully ${action === 'deposit' ? 'deposited' : 'withdrew'} $${amount} ${action === 'deposit' ? 'to' : 'from'} ${user.name}'s ${walletType} wallet`
      );

      // Reset form
      setAmount('');
      setReason('');
      setAction('deposit');
      setWalletType('capital');
      setIsOpen(false);

      // Callback to refresh user data
      if (onAdjustmentComplete) {
        onAdjustmentComplete();
      }
    } catch (error) {
      toast.error(error.response?.data?.message ?? `Failed to ${action} funds`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={12} />
        Adjust Wallet
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Wallet Adjustment</h3>
        <button
          onClick={() => setIsOpen(false)}
          disabled={loading}
          className="text-gray-500 hover:text-gray-400 disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Action selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAction('deposit')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
              action === 'deposit'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-dark-700 border-dark-500 text-gray-500 hover:text-gray-400'
            }`}
            disabled={loading}
          >
            <Plus size={12} />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setAction('withdraw')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
              action === 'withdraw'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-dark-700 border-dark-500 text-gray-500 hover:text-gray-400'
            }`}
            disabled={loading}
          >
            <Minus size={12} />
            Withdraw
          </button>
        </div>

        {/* Wallet type selector */}
        <div className="grid grid-cols-2 gap-2">
          {['capital', 'profit', 'commission', 'roi'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setWalletType(type)}
              className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                walletType === type
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-dark-700 border-dark-500 text-gray-500 hover:text-gray-400'
              }`}
              disabled={loading}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Display current balance */}
        <div className="bg-dark-700/50 px-3 py-2 rounded-lg text-xs">
          <div className="text-gray-500">Current {walletType} balance:</div>
          <div className="text-white font-semibold">
            ${(user.wallet?.[walletType] ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount (USD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            disabled={loading}
            required
          />
        </div>

        {/* Reason (optional) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g., Manual correction, User request, etc."
            maxLength="500"
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
            disabled={loading}
          />
          <div className="text-xs text-gray-600 mt-1">{reason.length}/500</div>
        </div>

        {/* Warning for withdrawal */}
        {action === 'withdraw' && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-300">
              Withdrawing funds will deduct from the user's {walletType} wallet. They will be notified.
            </div>
          </div>
        )}

        {/* Warning for deposit */}
        {action === 'deposit' && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <AlertCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-emerald-300">
              Depositing funds will add to the user's {walletType} wallet. They will be notified.
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${
              action === 'deposit'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50'
                : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 disabled:opacity-50'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {action === 'deposit' ? <Plus size={12} /> : <Minus size={12} />}
                {action === 'deposit' ? 'Deposit' : 'Withdraw'} ${amount || '0.00'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-semibold border bg-dark-700 border-dark-500 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
