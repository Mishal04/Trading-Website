import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: searchParams.get('ref') || '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.fullName,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        referralCode: form.referralCode || undefined,
      });
      navigate('/login');
    } catch (err) {
      const firstErr = err.response?.data?.errors?.[0]?.msg;
      const msg = firstErr || err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-4">
            <UserPlus className="text-gold-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Join Group Trading Plan today</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
            <input
              type="text"
              name="fullName"
              required
              value={form.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Phone</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors pr-10"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
              placeholder="Repeat password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Referral Code <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              name="referralCode"
              value={form.referralCode}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors uppercase"
              placeholder="ABC12345"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Creating...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-gold-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
