import { useState, useEffect } from 'react';
import { withdrawalAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  Award, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert,
  Send,
  Info
} from 'lucide-react';

export default function WithdrawTab({ user, onRefresh }) {
  const [type, setType] = useState('profit');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('BEP20');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [fetching, setFetching] = useState(true);

  const wallet = user?.wallet || { capital: 0, profit: 0, commission: 0 };
  const availableBalance = wallet[type] || 0;

  const fetchHistory = async () => {
    try {
      setFetching(true);
      const res = await withdrawalAPI.getHistory();
      setHistory(res.data.data.withdrawals || []);
    } catch (err) {
      console.error('Failed to load withdrawal history:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const num = parseFloat(amount);

    if (!num || num <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (num < 20) {
      toast.error('Minimum withdrawal amount is 20 USDT');
      return;
    }

    if (num > availableBalance) {
      toast.error(`Insufficient ${type} balance. Available: $${availableBalance}`);
      return;
    }

    if (!walletAddress.trim()) {
      toast.error(`Please provide your ${network} USDT wallet address`);
      return;
    }

    try {
      setLoading(true);
      const res = await withdrawalAPI.request({
        amount: num,
        type,
        network,
        walletAddress: walletAddress.trim()
      });
      toast.success(res.data.message || 'Withdrawal request submitted successfully!');
      setAmount('');
      setWalletAddress('');
      fetchHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || 'Withdrawal request failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowUpRight className="text-gold-400" /> Request Withdrawal
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Withdraw funds from your Capital, Profit, or Commission wallet directly to your crypto destination.
        </p>
      </div>

      {/* Withdrawal Processing Information */}
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">
              Withdrawal Processing Information
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Withdrawals are not processed on Saturdays and Sundays. Requests submitted after 12 AM Dubai time (UAE Time) are processed the next business day. All other requests are processed normally.
            </p>
          </div>
        </div>
      </div>

      {/* Select Wallet Balance Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { id: 'capital', label: 'Capital Balance', value: wallet.capital, icon: Wallet, color: 'text-blue-400', border: 'border-blue-500/30' },
          { id: 'profit', label: 'Profit Balance', value: wallet.profit, icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-500/30' },
          { id: 'commission', label: 'Commission Balance', value: wallet.commission, icon: Award, color: 'text-purple-400', border: 'border-purple-500/30' },
        ].map((item) => {
          const isSelected = type === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setType(item.id)}
              className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                isSelected
                  ? 'bg-dark-800 border-gold-400 ring-2 ring-gold-400/40 shadow-xl'
                  : 'bg-dark-800/50 border-dark-500 hover:border-dark-400'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
                <item.icon className={item.color} size={18} />
              </div>
              <div className="text-2xl font-black text-white">
                ${Number(item.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-gold-400' : 'text-gray-500'}`}>
                  {isSelected ? 'Selected Wallet' : 'Click to select'}
                </span>
                {isSelected && <CheckCircle2 size={14} className="text-gold-400" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Withdrawal Form */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleWithdraw} className="space-y-6">
          <div className="border-b border-dark-500 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Send size={18} className="text-gold-400" /> Submit Payout Request
            </h3>
            <p className="text-xs text-gray-400">
              Selected balance: <strong className="text-white capitalize">{type} Wallet</strong> (Available: ${Number(availableBalance).toFixed(2)})
            </p>
          </div>

          <div className="space-y-4">
            {/* Network Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">
                Crypto Network <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'BEP20', name: 'USDT (BEP20)', desc: 'BNB Smart Chain · Fast & Low Fee' },
                  { id: 'TRC20', name: 'USDT (TRC20)', desc: 'TRON Network · Standard' }
                ].map((net) => (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => setNetwork(net.id)}
                    className={`py-3 px-4 rounded-xl text-left border transition-all ${
                      network === net.id
                        ? 'bg-gold-400/10 border-gold-400 ring-1 ring-gold-400/50 shadow-md'
                        : 'bg-dark-900 border-dark-500 hover:border-dark-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${network === net.id ? 'text-gold-400' : 'text-white'}`}>
                        {net.name}
                      </span>
                      {network === net.id && <CheckCircle2 size={14} className="text-gold-400" />}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{net.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Withdrawal Amount (USDT) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="10"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Min 10.00"
                    className="w-full bg-dark-900 text-white rounded-xl pl-4 pr-16 py-3.5 border border-dark-500 focus:border-gold-400 focus:outline-none font-bold text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(availableBalance.toString())}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-gold-400/20 text-gold-400 hover:bg-gold-400/30 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Minimum payout is <strong>20 USDT</strong>.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  {network} Destination Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder={`Enter your ${network} USDT wallet address`}
                  className="w-full bg-dark-900 text-white rounded-xl px-4 py-3.5 border border-dark-500 focus:border-gold-400 focus:outline-none text-xs font-mono placeholder-gray-600"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">Double check your {network} address before submitting.</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || parseFloat(amount) < 20 || !walletAddress.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-extrabold text-base hover:brightness-110 transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} /> Processing Request...
              </>
            ) : (
              <>
                Confirm & Request Withdrawal ({network})
              </>
            )}
          </button>
        </form>
      </div>

      {/* Withdrawal History Table */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-gold-400" /> Withdrawal History
          </h3>
          <button
            onClick={fetchHistory}
            className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            title="Refresh history"
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {fetching ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <p className="text-gray-400 text-sm">No withdrawal requests submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Amount</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Wallet Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested At</th>
                  <th className="px-4 py-3 rounded-r-xl">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {history.map((item) => (
                  <tr key={item._id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-3.5 font-extrabold text-gold-400">${Number(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                      <span className="px-2 py-0.5 rounded bg-dark-900 border border-dark-500">
                        {item.network || 'BEP20'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 capitalize font-semibold">{item.type}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                        item.status === 'completed' || item.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : item.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400">
                      {new Date(item.requestedAt || item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 italic">
                      {item.adminNote || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
