import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.forgotPassword({ email: email.trim() });
      
      if (res.data?.success) {
        setSubmitted(true);
        toast.success('Reset link sent! Check your email.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reset email';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        {!submitted ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="text-gold-400" size={32} />
              </div>
              <h1 className="text-2xl font-bold">Forgot Password?</h1>
              <p className="text-gray-400 text-sm mt-2">
                No problem! Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 space-y-4"
            >
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors"
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              The reset link will expire in 1 hour for security.
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Check Your Email!</h2>
            <p className="text-sm text-gray-300">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-gray-400">
              If you don't see it, check your spam folder. The link expires in 1 hour.
            </p>

            <button
              onClick={() => {
                setEmail('');
                setSubmitted(false);
              }}
              className="w-full mt-6 py-2.5 rounded-lg font-semibold bg-dark-700 hover:bg-dark-600 text-white transition-colors text-sm"
            >
              Send Another Link
            </button>

            <Link
              to="/login"
              className="block py-2.5 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all text-sm"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
