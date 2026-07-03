import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserPlus, Mail, Lock, User, Check } from 'lucide-react';

interface RegisterProps {
  setCurrentPage: (page: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ setCurrentPage }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Tenant' as 'Tenant' | 'Owner',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectRole = (role: 'Tenant' | 'Owner') => {
    setFormData({ ...formData, role });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(formData.name, formData.email, formData.password, formData.role);
      // Main App switcher will automatically redirect to appropriate dashboard.
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="register-view" className="min-h-[85vh] bg-slate-50/30 flex items-center justify-center p-6 relative">
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-100/30 rounded-full blur-2xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-100/20 rounded-full blur-2xl -z-10" />

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Create an Account</h2>
          <p className="text-slate-400 text-xs font-medium">Join RentMate to find listings and match with others</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl p-4 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Custom interactive role selectors */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Your Role</label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => handleSelectRole('Tenant')}
                className={`p-4 rounded-2xl border text-center cursor-pointer relative flex flex-col items-center justify-center space-y-2 ${
                  formData.role === 'Tenant'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xs font-bold">I am a Tenant</span>
                <span className="text-[10px] font-normal text-slate-400">Seeking room listings</span>
                {formData.role === 'Tenant' && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white p-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div
                onClick={() => handleSelectRole('Owner')}
                className={`p-4 rounded-2xl border text-center cursor-pointer relative flex flex-col items-center justify-center space-y-2 ${
                  formData.role === 'Owner'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xs font-bold">I am an Owner</span>
                <span className="text-[10px] font-normal text-slate-400">Listing my spare rooms</span>
                {formData.role === 'Owner' && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white p-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 pl-11 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
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
            <UserPlus className="w-4.5 h-4.5" />
            <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400 font-medium">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-indigo-600 font-bold hover:underline bg-transparent border-0 cursor-pointer"
            >
              Log in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
