import { Zap, Clock, AlertCircle } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 px-4 py-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-2xl text-center space-y-8">
        
        {/* Logo / Branding */}
        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-400/30 bg-gold-400/5">
            <Zap size={18} className="text-gold-400 animate-pulse" />
            <span className="text-sm font-semibold text-gold-400">SolvexTrade</span>
          </div>
        </div>

        {/* Main heading */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-gold-400 via-gold-300 to-gold-400 bg-clip-text text-transparent leading-tight">
            We'll Be Back Soon!
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 font-light">
            SolvexTrade is currently undergoing maintenance.
          </p>
        </div>

        {/* Maintenance message */}
        <div className="space-y-4 bg-gradient-to-r from-dark-700/50 to-dark-600/50 border border-gold-400/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <div className="flex items-start gap-3 md:gap-4">
            <AlertCircle className="text-gold-400 flex-shrink-0 mt-1 md:mt-0" size={24} />
            <p className="text-base md:text-lg text-gray-300 text-left leading-relaxed">
              We're working to improve your experience and enhance our platform's performance. Our team is implementing important updates and optimizations. Thank you for your patience!
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="relative w-3 h-3">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 bg-emerald-400 rounded-full" />
            </div>
            <span className="text-sm text-gray-400">
              System Status: <span className="text-emerald-400 font-semibold">Maintenance in Progress</span>
            </span>
          </div>
        </div>

        {/* Estimated time */}
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Clock size={16} className="text-gold-400" />
          <span>Estimated completion: Within 24 hours</span>
        </div>

        {/* Contact info */}
        <div className="space-y-2 pt-4 border-t border-dark-600">
          <p className="text-gray-500 text-sm">
            For urgent inquiries, contact us at{' '}
            <a href="mailto:info.solvex1@gmail.com" className="text-gold-400 hover:text-gold-300 transition font-semibold">
              support@solvextrade.com
            </a>
          </p>
        </div>

        {/* Animated maintenance illustration */}
        <div className="flex justify-center pt-8">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            {/* Outer rotating circle */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-400 border-r-gold-400/50 animate-spin" />
            
            {/* Middle pulsing circle */}
            <div className="absolute inset-4 rounded-full border border-gold-400/30 animate-pulse" />
            
            {/* Inner wrench icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="text-gold-400 animate-bounce" size={48} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="fixed bottom-6 left-6 right-6 text-center text-gray-600 text-xs">
        <p>© 2026 SolvexTrade. All rights reserved.</p>
      </div>
    </div>
  );
}
