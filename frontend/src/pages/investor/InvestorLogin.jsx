import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvestorAuth } from '../../context/InvestorAuthContext';
import { TrendingUp, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvestorLogin() {
  const { login } = useInvestorAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/investor/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-4 py-16"
         style={{ background: 'linear-gradient(135deg,#0a0e1a 0%,#0d1a2e 50%,#0a0e1a 100%)' }}>
      {/* Brand badge */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
          <TrendingUp size={24} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">Investor Portal</p>
          <p className="text-white font-bold text-lg leading-tight">SolveXTrade</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-3xl border border-white/10 p-8"
           style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
        <div className="mb-6 text-center">
          <ShieldCheck size={32} className="mx-auto mb-3 text-amber-400" />
          <h1 className="text-2xl font-extrabold text-white">Investor Sign In</h1>
          <p className="text-gray-400 text-sm mt-1">Access your investment dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="investor-login-email"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                placeholder="investor@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="investor-login-password"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400 transition">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="investor-login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-dark-900 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
          >
            {loading ? 'Signing in…' : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          New investor?{' '}
          <Link to="/investor/register" className="text-amber-400 hover:text-amber-300 font-semibold">
            Create account
          </Link>
        </p>
        <p className="text-center text-gray-600 text-xs mt-3">
          Not an investor?{' '}
          <Link to="/login" className="text-gray-400 hover:text-white">User login →</Link>
        </p>
      </div>
    </div>
  );
}
