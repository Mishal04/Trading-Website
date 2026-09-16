import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvestorAuth } from '../../context/InvestorAuthContext';
import { TrendingUp, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, BadgeDollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const PLAN_PREVIEW = {
  A: [
    { pkg: 'Package 1', amounts: '$100, $200, $300, $900', rate: '0.75% / day' },
    { pkg: 'Package 2', amounts: '$1,000 – $5,000', rate: '1.00% / day' },
    { pkg: 'Package 3', amounts: '$6,000 – $9,000', rate: '1.25% / day' },
    { pkg: 'Package 4', amounts: '$10,000+', rate: '1.50% / day' }
  ]
};

export default function InvestorRegister() {
  const { register } = useInvestorAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate('/investor/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12"
         style={{ background: 'linear-gradient(135deg,#0a0e1a 0%,#0d1a2e 50%,#0a0e1a 100%)' }}>
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">

        {/* Left: Form */}
        <div className="rounded-3xl border border-white/10 p-8"
             style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">Investor Portal</p>
              <p className="text-white font-bold">SolveXTrade</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-1">Create Investor Account</h1>
          <p className="text-gray-400 text-sm mb-6">
            You'll be assigned <span className="text-amber-400 font-semibold">Phase 1</span> by default.
            Admin can update your phase after review.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inv-reg-name" type="text" required placeholder="John Smith"
                       value={form.name} onChange={set('name')}
                       className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inv-reg-email" type="email" required placeholder="investor@example.com"
                       value={form.email} onChange={set('email')}
                       className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Phone (optional)</label>
              <div className="relative">
                <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inv-reg-phone" type="tel" placeholder="+1 000 000 0000"
                       value={form.phone} onChange={set('phone')}
                       className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inv-reg-password" type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                       value={form.password} onChange={set('password')} minLength={6}
                       className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400 transition">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inv-reg-confirm" type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                       value={form.confirm} onChange={set('confirm')}
                       className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition text-sm" />
              </div>
            </div>

            <button id="inv-reg-submit" type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-dark-900 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              {loading ? 'Creating Account…' : <>Create Investor Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/investor/login" className="text-amber-400 hover:text-amber-300 font-semibold">Sign in</Link>
          </p>
          <p className="text-center text-gray-600 text-xs mt-2">
            Not an investor? <Link to="/register" className="text-gray-400 hover:text-white">Regular signup →</Link>
          </p>
        </div>

        {/* Right: Plan preview */}
        <div className="rounded-3xl border border-amber-500/20 p-8"
             style={{ background: 'rgba(245,158,11,0.04)' }}>
          <div className="flex items-center gap-2 mb-5">
            <BadgeDollarSign size={22} className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">Phase 1 Preview</h2>
            <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">Default</span>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            All new investors start on <strong className="text-amber-400">Phase 1</strong>. Admin may adjust your phase after account review.
          </p>

          <div className="space-y-3">
            {PLAN_PREVIEW.A.map((row) => (
              <div key={row.pkg} className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3"
                   style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <p className="text-white text-sm font-semibold">{row.pkg}</p>
                  <p className="text-gray-500 text-xs">{row.amounts}</p>
                </div>
                <span className="text-amber-400 font-bold text-sm">{row.rate}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-white/8 px-4 py-4 space-y-2"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">After 6 months</span>
              <span className="text-emerald-400 font-bold">8%–10% / month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Income cap</span>
              <span className="text-white font-bold">3× invested</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Principal withdrawal</span>
              <span className="text-white font-bold">Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
