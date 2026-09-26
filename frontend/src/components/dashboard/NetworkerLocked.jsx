import { Lock, Mail } from 'lucide-react';

export default function NetworkerLocked() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md px-6 py-12">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-gold-400/10 border border-gold-400/30">
            <Lock className="text-gold-400" size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Networker Access Locked</h2>
        <p className="text-gray-400 text-sm mb-6">
          The Networker section is currently locked. This section provides access to your referral network and 21-level commission structure.
        </p>
        
        <div className="bg-dark-800/60 border border-dark-600 rounded-lg p-4 text-left mb-6">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-gold-400" />
            To enable Networker access:
          </p>
          <ol className="text-xs text-gray-500 space-y-1.5 ml-2">
            <li>1. Contact the admin team</li>
            <li>2. Request Networker section access</li>
            <li>3. Admin will grant access to your account</li>
          </ol>
        </div>
        
        <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
          <Mail size={14} />
          Contact support@solvextrade.com
        </p>
      </div>
    </div>
  );
}
