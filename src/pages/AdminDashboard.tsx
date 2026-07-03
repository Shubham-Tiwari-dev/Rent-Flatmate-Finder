import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Listing } from '../types.js';
import { ShieldCheck, Users, Home, Settings, Ban, Trash2, Calendar, Mail, FileText, CheckCircle2 } from 'lucide-react';

interface StatsResponse {
  stats: {
    totalUsers: number;
    totalListings: number;
    activeListings: number;
    filledListings: number;
    totalRequests: number;
    totalChats: number;
  };
  recentUsers: User[];
  recentListings: Listing[];
}

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'stats'>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, listingsRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
        axios.get('/api/listing'),
      ]);

      setData(statsRes.data);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setListings(Array.isArray(listingsRes.data) ? listingsRes.data : []);
    } catch (err) {
      setError('Failed to fetch administrative records. Make sure you possess authorized credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleSuspend = async (userId: string, currentSuspension: boolean) => {
    try {
      await axios.put(`/api/admin/users/${userId}/suspend`, { isSuspended: !currentSuspension });
      const currentUsersList = Array.isArray(users) ? users : [];
      setUsers(currentUsersList.map((u) => (u.id === userId ? { ...u, isSuspended: !currentSuspension } : u)));
    } catch (err) {
      console.error('Failed to change user suspension status:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account? This deletes their associated rooms or matching profile specifications.')) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      const currentUsersList = Array.isArray(users) ? users : [];
      setUsers(currentUsersList.filter((u) => u.id !== userId));
      // Re-fetch listing updates
      const listRes = await axios.get('/api/listing');
      setListings(Array.isArray(listRes.data) ? listRes.data : []);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing permanently?')) return;
    try {
      await axios.delete(`/api/listing/${listingId}`);
      const currentListingsList = Array.isArray(listings) ? listings : [];
      setListings(currentListingsList.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error('Failed to delete listing:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-semibold">Authorizing Admin Panel Access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-4">
        <div className="bg-rose-50 p-4 rounded-full w-max mx-auto text-rose-500">
          < Ban className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Unauthorized Access</h3>
        <p className="text-slate-500 text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div id="admin-dashboard" className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* Title Header */}
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600 text-white p-2.5 rounded-2xl">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Platform Oversight</h1>
          <p className="text-slate-500 text-xs font-medium">Suspend accounts, delete listings, and view key database statistics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-max">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl ${
            activeTab === 'stats' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          General Statistics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl ${
            activeTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Manage Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl ${
            activeTab === 'listings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Listing Oversight ({listings.length})
        </button>
      </div>

      {/* Content Switcher */}
      {activeTab === 'stats' && data && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-indigo-600">{data.stats.totalUsers}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Users</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-indigo-600">{data.stats.totalListings}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Rooms</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-indigo-600">{data.stats.activeListings}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Active Rooms</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-indigo-600">{data.stats.totalRequests}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Applications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recent users list */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Recently Registered Accounts</h3>
              <div className="space-y-3">
                {data.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 mb-2">
                    <div>
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded capitalize">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent listings */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Recent Listings published</h3>
              <div className="space-y-3">
                {data.recentListings.slice(0, 5).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 mb-2">
                    <div>
                      <p className="font-bold text-slate-800">{l.title}</p>
                      <p className="text-[10px] text-slate-400">{l.location} | Rent: ${l.rent}/mo</p>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded">
                      {l.roomType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{u.name}</td>
                    <td className="p-4 text-slate-500">{u.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded text-[10px] capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                        className={`px-3 py-1.5 rounded-lg font-bold border transition ${
                          u.isSuspended
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.isSuspended ? 'Suspended' : 'Suspend'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                  <th className="p-4">Listing Space</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Room Type</th>
                  <th className="p-4">Rent</th>
                  <th className="p-4">Date Added</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800">{l.title}</p>
                        <p className="text-[10px] text-slate-400">Owner ID: {l.ownerId}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500">{l.location}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded text-[10px]">
                        {l.roomType}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700">${l.rent}/mo</td>
                    <td className="p-4 text-slate-400">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteListing(l.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
