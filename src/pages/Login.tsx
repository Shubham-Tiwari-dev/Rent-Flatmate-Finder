import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LogIn, Mail, Lock } from 'lucide-react';

interface LoginProps {
  setCurrentPage: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ setCurrentPage }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // Let AuthContext handle standard page updates, the main App.tsx will automatically redirect.
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-view" className="min-h-[85vh] bg-slate-50/30 flex items-center justify-center p-6 relative">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-100/30 rounded-full blur-2xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-100/20 rounded-full blur-2xl -z-10" />

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-xs font-medium">Log in to view listings and chat with flatmates</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl p-4 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 pl-11 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 pl-11 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            <LogIn className="w-4.5 h-4.5" />
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400 font-medium">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentPage('register')}
              className="text-indigo-600 font-bold hover:underline bg-transparent border-0 cursor-pointer"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
