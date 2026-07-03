import React from 'react';
import { Home, Sparkles, ShieldCheck, Users, ArrowRight } from 'lucide-react';

interface LandingProps {
  setCurrentPage: (page: string) => void;
  isAuthenticated: boolean;
  userRole?: string;
}

export const Landing: React.FC<LandingProps> = ({ setCurrentPage, isAuthenticated, userRole }) => {
  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (userRole === 'Admin') setCurrentPage('admin-dashboard');
      else if (userRole === 'Owner') setCurrentPage('owner-dashboard');
      else setCurrentPage('tenant-dashboard');
    } else {
      setCurrentPage('register');
    }
  };

  return (
    <div id="landing-page" className="relative overflow-hidden min-h-[90vh] bg-slate-50/50 flex flex-col justify-between">
      
      {/* Background radial effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-200/10 rounded-full blur-3xl -z-10" />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-grow">
        
        {/* Left column text */}
        <div className="space-y-6 md:space-y-8">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powering matches with Google Gemini AI</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight leading-tight md:leading-none">
            Find the perfect <span className="text-indigo-600">Room</span> & <span className="text-emerald-500">Flatmate</span>
          </h1>

          <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-xl">
            RentMate combines local rental listing search with high-precision Google Gemini AI scoring. We analyze location, budget, schedules, and lifestyle bios to discover your ultimate match.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 group text-sm md:text-base"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-200" />
            </button>
            <button
              onClick={() => setCurrentPage('login')}
              className="px-8 py-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 font-bold text-slate-700 flex items-center justify-center text-sm md:text-base"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Right column: visual preview card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl rotate-3 scale-102 opacity-5 blur-sm" />
          <div className="relative bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
            
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl font-bold text-sm">
                  89%
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Gemini Matching Engine</p>
                  <p className="text-xs text-slate-400">High lifestyle compatibility score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold rounded-full uppercase">
                Verified Match
              </span>
            </div>

            {/* Simulated match details */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Bio Preference</p>
                <p className="text-xs text-slate-600 italic">"I value quiet study environments, neatness, and love weekend cooking..."</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owner Space Bio</p>
                <p className="text-xs text-slate-600 italic">"Bright bedroom, fully furnished with writing desk, shared modern kitchen..."</p>
              </div>
            </div>

            {/* Badge specifications */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/30">
                <p className="text-lg font-bold text-indigo-600">40%</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase">Budget Match</p>
              </div>
              <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/30">
                <p className="text-lg font-bold text-indigo-600">30%</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase">Location Match</p>
              </div>
              <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/30">
                <p className="text-lg font-bold text-indigo-600">30%</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase">Schedule Fit</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature section */}
      <section className="bg-white border-t border-slate-100 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800">Designed with Safety and Speed</h2>
            <p className="text-slate-500 text-sm">Experience the modern way to discover rental listing collaborations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100/50 space-y-4">
              <div className="bg-indigo-500 text-white p-3 rounded-2xl w-max">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">AI Compatibility Analysis</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our Gemini AI reviews locations, budget intervals, available dates, and user backgrounds to render detailed, secure matches.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100/50 space-y-4">
              <div className="bg-emerald-500 text-white p-3 rounded-2xl w-max">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Role-Based Dashboard</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Separate flows for Owners, Tenants, and Platform Administrators ensure clean management, statistics oversight, and profiles.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100/50 space-y-4">
              <div className="bg-indigo-600 text-white p-3 rounded-2xl w-max">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Private Secure Chat</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect only after mutually accepted interest requests. Real-time typing indicators and message tracking prevent spam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-6 text-center text-xs text-slate-400">
        <p>© 2026 RentMate. Made with precision for developers and renters.</p>
      </footer>
    </div>
  );
};
