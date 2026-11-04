import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-white">Invalid Reset Link</h2>
            <p className="text-sm text-gray-300">
              The password reset link is missing or invalid.
            </p>
            <Link
              to="/forgot-password"
              className="block py-2.5 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.resetPassword({
        token,
        newPassword: password
      });

      if (res.data?.success) {
        setSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password';
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

        {!success ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="text-gold-400" size={32} />
              </div>
              <h1 className="text-2xl font-bold">Reset Password</h1>
              <p className="text-gray-400 text-sm mt-2">
                Enter a new password for your account
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 space-y-4"
            >
              {/* New Password */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors pr-10"
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white placeholder-gray-600 focus:outline-none focus:border-gold-400 transition-colors pr-10"
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Password must be at least 6 characters
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Password Reset!</h2>
            <p className="text-sm text-gray-300">
              Your password has been successfully reset.
            </p>
            <p className="text-xs text-gray-400">
              Redirecting to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
