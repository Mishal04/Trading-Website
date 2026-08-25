import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    authAPI
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed');
      });
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-8">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto text-gold-400 animate-spin mb-4" size={40} />
              <h1 className="text-xl font-bold mb-2">Verifying Email...</h1>
              <p className="text-gray-400 text-sm">Please wait</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="mx-auto text-emerald-400 mb-4" size={40} />
              <h1 className="text-xl font-bold mb-2">Email Verified!</h1>
              <p className="text-gray-400 text-sm mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto text-red-400 mb-4" size={40} />
              <h1 className="text-xl font-bold mb-2">Verification Failed</h1>
              <p className="text-gray-400 text-sm mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 rounded-lg font-semibold border border-dark-500 text-gray-300 hover:border-gold-400 hover:text-gold-400"
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
