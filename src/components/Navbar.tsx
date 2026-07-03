import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Home, MessageSquare, Bell, User, Settings, LogOut, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  unreadMessagesCount,
  unreadNotificationsCount,
}) => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <header id="nav-header" className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div 
          onClick={() => setCurrentPage('landing')} 
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <div className="bg-indigo-600 text-white p-2 rounded-xl group-hover:bg-indigo-700 transition">
            <Home className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">
            Rent<span className="text-indigo-600">Mate</span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentPage('login')}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Sign In
          </button>
          <button
            onClick={() => setCurrentPage('register')}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-100"
          >
            Get Started
          </button>
        </div>
      </header>
    );
  }

  const getDashboardName = () => {
    if (user.role === 'Admin') return 'admin-dashboard';
    if (user.role === 'Owner') return 'owner-dashboard';
    return 'tenant-dashboard';
  };

  return (
    <header id="nav-header-authenticated" className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
      <div 
        onClick={() => setCurrentPage('landing')} 
        className="flex items-center space-x-2 cursor-pointer group"
      >
        <div className="bg-indigo-600 text-white p-2 rounded-xl group-hover:bg-indigo-700 transition">
          <Home className="w-4.5 h-4.5" />
        </div>
        <span className="font-bold text-lg tracking-tight text-slate-800">
          Rent<span className="text-indigo-600">Mate</span>
        </span>
      </div>

      {/* Main navigation */}
      <nav className="hidden md:flex items-center space-x-1">
        <button
          onClick={() => setCurrentPage(getDashboardName())}
          className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center space-x-2 ${
            currentPage.includes('dashboard')
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {user.role === 'Admin' && <ShieldCheck className="w-4 h-4" />}
          <span>Dashboard</span>
        </button>

        {user.role === 'Tenant' && (
          <button
            onClick={() => setCurrentPage('profile')}
            className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center space-x-2 ${
              currentPage === 'profile'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>
        )}

        <button
          onClick={() => setCurrentPage('chat')}
          className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center space-x-2 relative ${
            currentPage === 'chat'
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentPage('notifications')}
          className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center space-x-2 relative ${
            currentPage === 'notifications'
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts</span>
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </nav>

      {/* User profile dropdown */}
      <div className="flex items-center space-x-2 border-l border-slate-100 pl-4">
        <div className="text-right mr-2 hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
          <p className="text-xs text-slate-400 capitalize">{user.role}</p>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage('settings')}
            title="Settings"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              logout();
              setCurrentPage('landing');
            }}
            title="Log Out"
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
