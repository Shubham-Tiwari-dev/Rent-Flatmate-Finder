import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Landing } from './pages/Landing.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { TenantDashboard } from './pages/TenantDashboard.js';
import { OwnerDashboard } from './pages/OwnerDashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { ChatPage } from './pages/ChatPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { MapPin, Sparkles, HelpCircle, AlertTriangle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, token, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Synchronize unread badge counts
  const syncUnreadCounts = async () => {
    if (!token || !user) {
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const [chatRes, notifRes] = await Promise.all([
        axios.get('/api/chat'),
        axios.get('/api/notifications'),
      ]);

      const totalUnreadMessages = Array.isArray(chatRes.data)
        ? chatRes.data.reduce((acc: number, chat: any) => acc + (chat.unreadCount || 0), 0)
        : 0;
      const totalUnreadNotifications = Array.isArray(notifRes.data)
        ? notifRes.data.filter((n: any) => !n.isRead).length
        : 0;

      setUnreadMessagesCount(totalUnreadMessages);
      setUnreadNotificationsCount(totalUnreadNotifications);
    } catch (err: any) {
      console.error('Failed to sync workspace feeds:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  };

  useEffect(() => {
    syncUnreadCounts();
    let interval: NodeJS.Timeout;
    if (token && user) {
      interval = setInterval(syncUnreadCounts, 12000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, user, currentPage]);

  // Handle automatic routing redirects based on role login state
  useEffect(() => {
    if (user) {
      // If user logs in and is on landing, login, or register page, redirect to their role's dashboard
      if (['landing', 'login', 'register'].includes(currentPage)) {
        if (user.role === 'Admin') setCurrentPage('admin-dashboard');
        else if (user.role === 'Owner') setCurrentPage('owner-dashboard');
        else setCurrentPage('tenant-dashboard');
      }
    } else {
      // If user logs out, return to landing
      if (!['landing', 'login', 'register'].includes(currentPage)) {
        setCurrentPage('landing');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-bold font-mono uppercase tracking-wider mt-4">Initializing RentMate Workspace...</p>
      </div>
    );
  }

  // Helper page renderer
  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return (
          <Landing
            setCurrentPage={setCurrentPage}
            isAuthenticated={!!user}
            userRole={user?.role}
          />
        );
      case 'login':
        return <Login setCurrentPage={setCurrentPage} />;
      case 'register':
        return <Register setCurrentPage={setCurrentPage} />;
      
      // Secured Tenant Dashboard
      case 'tenant-dashboard':
        if (!user || user.role !== 'Tenant') return <ForbiddenPage roleRequired="Tenant" />;
        return <TenantDashboard setCurrentPage={setCurrentPage} />;

      // Secured Owner Dashboard
      case 'owner-dashboard':
        if (!user || user.role !== 'Owner') return <ForbiddenPage roleRequired="Owner" />;
        return <OwnerDashboard />;

      // Secured Admin Dashboard
      case 'admin-dashboard':
        if (!user || user.role !== 'Admin') return <ForbiddenPage roleRequired="Admin" />;
        return <AdminDashboard />;

      case 'profile':
        if (!user || user.role !== 'Tenant') return <ForbiddenPage roleRequired="Tenant" />;
        return <ProfilePage />;

      case 'chat':
        if (!user) return <Login setCurrentPage={setCurrentPage} />;
        return <ChatPage />;

      case 'notifications':
        if (!user) return <Login setCurrentPage={setCurrentPage} />;
        return <NotificationsPage />;

      case 'settings':
        return <SettingsPage />;

      default:
        return <NotFoundPage setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />
      <main className="flex-grow">
        {renderPage()}
      </main>
    </div>
  );
};

// Forbidden Guard View
const ForbiddenPage: React.FC<{ roleRequired: string }> = ({ roleRequired }) => (
  <div className="max-w-md mx-auto my-16 bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-4">
    <div className="bg-rose-50 text-rose-500 p-4 rounded-full w-max mx-auto">
      <AlertTriangle className="w-8 h-8" />
    </div>
    <h3 className="font-bold text-slate-800 text-lg">Access Denied</h3>
    <p className="text-slate-500 text-xs">
      This panel requires authorized credentials for <strong>{roleRequired}</strong> accounts.
    </p>
  </div>
);

// Elegant 404 View
const NotFoundPage: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => (
  <div className="max-w-md mx-auto my-16 bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-4">
    <div className="bg-indigo-50 text-indigo-500 p-4 rounded-full w-max mx-auto">
      <HelpCircle className="w-8 h-8" />
    </div>
    <h3 className="font-bold text-slate-800 text-lg">Page Not Found</h3>
    <p className="text-slate-500 text-xs">
      The requested workspace screen could not be resolved.
    </p>
    <button
      onClick={() => setCurrentPage('landing')}
      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100"
    >
      Return Home
    </button>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
