import { createContext, useContext, useState, useEffect } from 'react';
import { investorAPI } from '../services/api';
import toast from 'react-hot-toast';

const InvestorAuthContext = createContext(null);

export function InvestorAuthProvider({ children }) {
  const [investor, setInvestor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('investor_token');
    const saved  = localStorage.getItem('investor_user');
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        setInvestor(parsed);
        investorAPI.me()
          .then((res) => {
            const u = res.data?.data?.investor || res.data?.investor;
            if (u) {
              const full = { ...parsed, ...u };
              setInvestor(full);
              localStorage.setItem('investor_user', JSON.stringify(full));
            }
          })
          .catch(() => {
            localStorage.removeItem('investor_token');
            localStorage.removeItem('investor_user');
            setInvestor(null);
          })
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await investorAPI.login({ email, password });
    const token   = res.data?.data?.token;
    const invData = res.data?.data?.investor;
    if (token && invData) {
      localStorage.setItem('investor_token', token);
      localStorage.setItem('investor_user', JSON.stringify(invData));
      setInvestor(invData);
      toast.success('Welcome back!');
      return invData;
    }
    throw new Error('Login failed');
  };

  const register = async (formData) => {
    const res = await investorAPI.register(formData);
    const token   = res.data?.data?.token;
    const invData = res.data?.data?.investor;
    if (token && invData) {
      localStorage.setItem('investor_token', token);
      localStorage.setItem('investor_user', JSON.stringify(invData));
      setInvestor(invData);
    }
    toast.success(res.data.message || 'Account created!');
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('investor_token');
    localStorage.removeItem('investor_user');
    setInvestor(null);
    toast.success('Logged out');
  };

  return (
    <InvestorAuthContext.Provider value={{ investor, loading, login, register, logout, setInvestor }}>
      {children}
    </InvestorAuthContext.Provider>
  );
}

export const useInvestorAuth = () => {
  const ctx = useContext(InvestorAuthContext);
  if (!ctx) throw new Error('useInvestorAuth must be used within InvestorAuthProvider');
  return ctx;
};
