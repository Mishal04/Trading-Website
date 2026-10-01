import { useAuth } from '../context/AuthContext';
import { LogOut, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ImpersonationBanner() {
  const { user, logout } = useAuth();

  // Check if user is impersonated by looking at localStorage
  const token = localStorage.getItem('token');
  let isImpersonating = false;
  let impersonationData = null;

  if (token) {
    try {
      // Try to decode JWT to check for impersonation flag
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      
      if (decoded.impersonated === true) {
        isImpersonating = true;
        impersonationData = {
          impersonatedByEmail: decoded.impersonatedByEmail,
          impersonationStarted: decoded.impersonationStarted,
          expiresIn: decoded.expiresIn
        };
      }
    } catch (error) {
      // Silent fail - if we can't decode, assume not impersonating
    }
  }

  if (!isImpersonating) {
    return null;
  }

  const handleExitImpersonation = () => {
    logout();
    toast.success('Exited impersonation mode');
    window.location.href = '/admin';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 border-b-2 border-blue-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Warning info */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="text-white" size={20} />
          </div>
          <div className="text-sm text-white">
            <span className="font-bold">You are viewing as:</span>
            <span className="ml-2 font-semibold text-blue-100">{user?.name} ({user?.email})</span>
            {impersonationData?.impersonatedByEmail && (
              <span className="ml-2 text-blue-200">
                — Admin: <span className="font-semibold">{impersonationData.impersonatedByEmail}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Time remaining + Exit button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-blue-100">
            <Clock size={14} />
            <span>Session expires in 30 minutes</span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors"
            title="Exit impersonation and return to admin panel"
          >
            <LogOut size={14} />
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
