import { useState, useEffect } from 'react';
import api, { commissionAPI, withdrawalAPI } from '../../services/api';
import { History, Filter, RefreshCw, ArrowUpRight, ArrowDownLeft, Award, Wallet, TrendingUp } from 'lucide-react';

export default function TransactionsTab() {
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [fetching, setFetching] = useState(true);

  const fetchTransactions = async () => {
    try {
      setFetching(true);
      // Attempt GET /transactions first
      const res = await api.get('/transactions').catch(() => null);
      if (res && res.data?.data?.transactions) {
        setTransactions(res.data.data.transactions);
      } else {
        // Fallback: Combine commissions + withdrawals + dashboard transactions
        const [commRes, wthRes] = await Promise.all([
          commissionAPI.getMy().catch(() => null),
          withdrawalAPI.getHistory().catch(() => null),
        ]);

        const combined = [];
        if (commRes?.data?.data?.commissions) {
          commRes.data.data.commissions.forEach(c => {
            combined.push({
              _id: c._id,
              type: 'commission',
              amount: c.commissionAmount,
              description: c.description || `Level ${c.level} commission`,
              status: 'completed',
              date: c.date || c.createdAt
            });
          });
        }

        if (wthRes?.data?.data?.withdrawals) {
          wthRes.data.data.withdrawals.forEach(w => {
            combined.push({
              _id: w._id,
              type: 'withdrawal',
              amount: w.amount,
              description: `Withdrawal request (${w.type})`,
              status: w.status,
              date: w.requestedAt || w.createdAt
            });
          });
        }

        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(combined);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(t => t.type === filter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="text-gold-400" /> Transaction Ledger
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Complete audit log of all your investments, daily profits, team commissions, and withdrawal requests.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dark-500 bg-dark-800/60 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'investment', label: 'Investments' },
            { id: 'profit', label: 'Profits' },
            { id: 'commission', label: 'Commissions' },
            { id: 'withdrawal', label: 'Withdrawals' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors capitalize ${
                filter === tab.id
                  ? 'bg-gold-400 text-dark-900 shadow-md'
                  : 'bg-dark-900 text-gray-400 hover:text-white border border-dark-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchTransactions}
          className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
          title="Refresh ledger"
        >
          <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
        {fetching ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading transaction history...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <p className="text-gray-400 text-sm">No transactions found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {filtered.map((tx) => (
                  <tr key={tx._id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                        tx.type === 'investment' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        tx.type === 'profit' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        tx.type === 'commission' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        tx.type === 'withdrawal' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white max-w-xs truncate">
                      {tx.description || tx.type}
                    </td>
                    <td className={`px-4 py-3.5 font-extrabold text-sm ${
                      tx.type === 'withdrawal' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${Number(tx.amount || 0).toFixed(2)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
