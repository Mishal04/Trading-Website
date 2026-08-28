import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-dark-500 bg-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-bold text-dark-900 text-xs">
                GT
              </div>
              <span className="font-bold">
                Group <span className="text-gold-400">Trading</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Transparent profit sharing with 25-level commissions, leadership salary and performance rewards.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-gold-400">Quick Links</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <a href="/#packages" className="block hover:text-gold-400 transition-colors">Packages</a>
              <a href="/#profit" className="block hover:text-gold-400 transition-colors">Profit Sharing</a>
              <a href="/#levels" className="block hover:text-gold-400 transition-colors">25-Level Commission</a>
              <a href="/#rewards" className="block hover:text-gold-400 transition-colors">Rewards</a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-gold-400">Important</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              No profit, salary, reward or level commission is guaranteed.
              All distributions depend on actual realized profit and available allocated pools.
              Trade only with funds you can afford to lose.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-dark-500 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Group Trading Plan. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-gray-500">
            <Link to="/login" className="hover:text-gold-400">Login</Link>
            <Link to="/register" className="hover:text-gold-400">Register</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
