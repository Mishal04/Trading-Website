import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const navLinks = [
    { label: 'Home',           href: '/#home' },
    { label: 'Packages',       href: '/#packages' },
    { label: 'Profit Sharing', href: '/#profit' },
    { label: 'Levels',         href: '/#levels' },
    { label: 'Rewards',        href: '/#rewards' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-dark-900/90 backdrop-blur-md border-b border-dark-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-bold text-dark-900 text-sm">
              GT
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span style={{ color: '#F8FAFF' }}>Group</span>{' '}
              <span className="gradient-text">Trading</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          {!isDashboard && (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-gray-400 hover:text-gold-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard/"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold-400 transition-colors"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-dark-500 hover:border-gold-400 text-gray-400 hover:text-gold-400 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gold-400 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 transition-all"
                  style={{ color: '#050B1F' }}
                >
                  Start Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-400"
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
                  onClick={() => setOpen(false)}
                  className="block text-sm text-gray-400 hover:text-gold-400"
                >
                  {link.label}
                </a>
              ))}
            {user ? (
              <>
                <Link
                  to="/dashboard/"
                  onClick={() => setOpen(false)}
                  className="block text-sm text-gray-400 hover:text-gold-400"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="block text-sm text-gray-400 hover:text-gold-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block text-sm text-gray-400 hover:text-gold-400"
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
