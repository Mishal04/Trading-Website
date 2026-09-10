import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const navLinks = [
    { label: 'Home', href: '/#home' },
    { label: 'Packages', href: '/#packages' },
    { label: 'Investors', href: '/#investors' },
  ];

  const handleNavClick = (e, href) => {
    if (href.startsWith('/#') && location.pathname === '/') {
      const targetId = href.replace('/#', '');
      const element = document.getElementById(targetId);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-dark-900/90 backdrop-blur-md border-b border-dark-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Solvex Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)]" />
            <span className="font-black text-xl tracking-wider">
              <span className="text-white">SOLVE</span><span className="text-gold-400">X</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          {!isDashboard && (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-sm font-medium text-gray-300 hover:text-gold-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/investor/login"
              className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              Investor Portal
            </Link>
            {user ? (
              <>
                {user.accountType === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold-400/15 border border-gold-400/30 text-xs font-semibold text-gold-400 hover:bg-gold-400/25 transition-all"
                  >
                    <ShieldCheck size={15} />
                    Admin Panel
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-gold-400 transition-colors"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-dark-500 hover:border-gold-400 text-gray-300 hover:text-gold-400 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-gold-400 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all"
                >
                  Start Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-300"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-dark-500 bg-dark-800">
          <div className="px-4 py-4 space-y-3">
            {!isDashboard &&
              navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    handleNavClick(e, link.href);
                    setOpen(false);
                  }}
                  className="block text-sm text-gray-300 hover:text-gold-400"
                >
                  {link.label}
                </a>
              ))}
            {user ? (
              <>
                {user.accountType === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="block text-sm font-semibold text-gold-400 hover:text-gold-300"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block text-sm text-gray-300 hover:text-gold-400"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="block text-sm text-gray-300 hover:text-gold-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/investor/login"
                  onClick={() => setOpen(false)}
                  className="block text-sm font-semibold text-amber-400 py-1"
                >
                  ⚡ Investor Portal (Login / Register)
                </Link>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block text-sm text-gray-300 hover:text-gold-400"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="block text-sm font-semibold text-gold-400"
                >
                  Start Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
