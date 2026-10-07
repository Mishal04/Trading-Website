import { Coins } from 'lucide-react';
import WalletManager from '../../components/admin/WalletManager';

export default function Wallets() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gold-500/15 border border-gold-500/30">
          <Coins size={24} className="text-gold-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Crypto Wallets</h1>
          <p className="text-sm text-gray-400 mt-1">Manage rotating deposit wallet addresses</p>
        </div>
      </div>

      {/* Content */}
      <WalletManager />
    </div>
  );
}
