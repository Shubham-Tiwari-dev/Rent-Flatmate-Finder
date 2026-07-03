import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { User, Profile } from '../types.js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'Tenant' | 'Owner' | 'Admin') => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set initial axios auth header synchronously
const initialToken = localStorage.getItem('rent_token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(true);

  // Synchronous token configuration helper
  const updateAuthToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      localStorage.setItem('rent_token', newToken);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('rent_token');
    }
  };

  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get('/api/me');
      setUser({
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
        createdAt: res.data.createdAt,
      });
      if (res.data.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error('Failed to refresh user credentials:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/login', { email, password });
    updateAuthToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string, role: 'Tenant' | 'Owner' | 'Admin') => {
    const res = await axios.post('/api/register', { name, email, password, role });
    updateAuthToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    updateAuthToken(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const res = await axios.put('/api/profile', updates);
    setProfile(res.data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
