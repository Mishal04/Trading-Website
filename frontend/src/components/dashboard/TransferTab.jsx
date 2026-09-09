import { useState, useEffect } from 'react';
import { walletAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
   ArrowLeftRight,
   Send,
   Clock,
   RefreshCw,
   CheckCircle2,
   TrendingUp,
   User,
   DollarSign,
   MessageSquare,
   ArrowUpRight,
   ArrowDownLeft
 } from 'lucide-react';

export default function TransferTab({ user, onRefresh }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Transfer originates from profit wallet
  const availableProfit = user?.wallet?.profit || 0;

  const fetchTransfers = async () => {
    try {
      setFetching(true);
      const res = await walletAPI.getTransfers();
      if (res?.data?.data?.transfers) {
        setTransfers(res.data.data.transfers);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!recipient.trim()) {
      toast.error('Recipient identifier (email or referral code) is required');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (numAmount > availableProfit) {
      toast.error(`Insufficient profit balance. Available: $${Number(availableProfit).toFixed(2)} USDT`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await walletAPI.transfer({
        to: recipient.trim(),
        amount: numAmount,
        note: note.trim() || undefined
      });

      toast.success(res.data.message || 'P2P Transfer completed successfully!');
      setRecipient('');
      setAmount('');
      setNote('');
      fetchTransfers();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Transfer failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowLeftRight className="text-gold-400" /> Internal P2P Transfer
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Instant member-to-member USDT balance transfer with zero network fee.
        </p>
      </div>

      {/* Available Balance Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-dark-800 via-dark-700/60 to-dark-800 p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Available Profit Balance (Withdrawable / Transferable)
          </span>
          <div className="text-3xl font-extrabold text-white flex items-center gap-2">
            ${Number(availableProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm font-normal text-gray-400">USDT</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Transfers are deducted directly from your Profit wallet and instantly credited to the recipient.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
          <CheckCircle2 size={16} /> Instant Settlement · 0% Gas Fees
        </div>
      </div>

      {/* Transfer Form */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleTransfer} className="space-y-6">
          <div className="border-b border-dark-500 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Send size={18} className="text-gold-400" /> Send USDT to Member
            </h3>
            <p className="text-xs text-gray-400">Enter recipient details, amount, and optional note.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recipient */}
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-2 block flex items-center gap-1.5">
                <User size={13} className="text-gold-400" />
                Recipient (Email or Referral Code) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. member@example.com or REF12345"
                className="w-full bg-dark-900 text-white rounded-xl px-4 py-3 border border-dark-500 focus:border-gold-400 focus:outline-none text-sm placeholder-gray-600 transition-colors"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Recipient must be a registered member.</p>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-2 block flex items-center gap-1.5">
                <DollarSign size={13} className="text-gold-400" />
                Transfer Amount (USDT) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableProfit}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark-900 text-white rounded-xl pl-4 pr-16 py-3 border border-dark-500 focus:border-gold-400 focus:outline-none text-sm font-bold placeholder-gray-600 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(availableProfit.toString())}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-gold-400/20 text-gold-400 hover:bg-gold-400/30 transition-colors"
                >
                  MAX
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Maximum available: ${Number(availableProfit).toFixed(2)} USDT</p>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-2 block flex items-center gap-1.5">
              <MessageSquare size={13} className="text-gold-400" />
              Transfer Note / Remark <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. For project activation, peer settlement…"
              maxLength={200}
              className="w-full bg-dark-900 text-white rounded-xl px-4 py-3 border border-dark-500 focus:border-gold-400 focus:outline-none text-sm placeholder-gray-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !recipient.trim() || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableProfit}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-extrabold text-base hover:brightness-110 transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><RefreshCw className="animate-spin" size={18} /> Processing Transfer…</>
            ) : (
              <><Send size={18} /> Send {amount ? `$${Number(amount).toFixed(2)} USDT` : 'Transfer'}</>
            )}
          </button>
        </form>
      </div>

      {/* Transfer History */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-gold-400" /> P2P Transfer History
          </h3>
          <button
            onClick={fetchTransfers}
            className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            title="Refresh history"
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {fetching ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading transfers…</div>
        ) : transfers.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <ArrowLeftRight size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No P2P transfers found.</p>
            <p className="text-xs text-gray-500 mt-1">Send or receive USDT with other members anytime.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Type</th>
                  <th className="px-4 py-3">Counterparty</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Note / Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {transfers.map((tx) => {
                  const isSent = tx.direction === 'out' || tx.type === 'P2P_OUT';
                  return (
                    <tr key={tx._id} className="hover:bg-dark-700/30">
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                          isSent ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isSent ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {isSent ? 'Sent' : 'Received'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-white">
                        {tx.counterparty ? (
                          <div>
                            <div>{tx.counterparty.name || tx.counterparty.email}</div>
                            <div className="text-[10px] text-gray-500">{tx.counterparty.referralCode || tx.counterparty.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">{tx.description || 'P2P Member'}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3.5 font-extrabold text-sm ${
                        isSent ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {isSent ? '-' : '+'}${Number(tx.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 max-w-xs truncate">
                        {tx.note || tx.description || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-900 text-gray-400 border border-dark-500 capitalize">
                          {tx.status || 'completed'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400">
                        {new Date(tx.date || tx.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
