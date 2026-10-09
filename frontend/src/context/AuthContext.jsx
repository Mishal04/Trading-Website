import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        authAPI.me()
          .then((res) => {
            const u = res.data?.data?.user || res.data?.user || res.data;
            if (u) {
              const fullUser = {
                ...parsed,
                ...u,
                accountType: u.accountType || parsed.accountType || 'user'
              };
              setUser(fullUser);
              localStorage.setItem('user', JSON.stringify(fullUser));
            }
          })
          .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
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
    try {
      const res = await authAPI.login({ email, password });
      const token = res.data?.data?.token || res.data?.token;
      const userData = res.data?.data?.user || res.data?.user;
      
      if (!token || !userData) {
        throw new Error('Invalid response from server');
      }
      
      const fullUser = {
        ...userData,
        accountType: userData.accountType || 'user'
      };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(fullUser));
      setUser(fullUser);
      toast.success('Login successful');
      return fullUser;
    } catch (error) {
      // Re-throw error so caller (Login.jsx) can handle it
      throw error;
    }
  };

  const register = async (formData) => {
    const res = await authAPI.register(formData);
    const token = res.data?.data?.token || res.data?.token;
    const userData = res.data?.data?.user || res.data?.user;
    if (token && userData) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    toast.success(res.data.message || 'Registration successful!');
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out');
  };

  const exitImpersonation = () => {
    // Restore the admin token that was saved before impersonation
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (adminToken && adminUser) {
      // Restore admin session
      localStorage.setItem('token', adminToken);
      localStorage.setItem('user', adminUser);
      const parsedAdminUser = JSON.parse(adminUser);
      setUser(parsedAdminUser);
      
      // Clean up the saved admin credentials
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      
      toast.success('Exited impersonation - admin session restored');
    } else {
      // Fallback: just logout
      logout();
      toast.info('Admin session not found - logging out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
