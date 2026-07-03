import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Notification } from '../types.js';
import { Bell, Check, Trash2, Calendar } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axios.put('/api/notifications/read');
      const currentList = Array.isArray(notifications) ? notifications : [];
      setNotifications(currentList.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      const currentList = Array.isArray(notifications) ? notifications : [];
      setNotifications(currentList.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const currentList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = currentList.filter((n) => !n.isRead).length;

  return (
    <div id="notifications-view" className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            <span>Alert Center</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium">Review interest matches, requests status, and system updates</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl flex items-center space-x-1 border border-indigo-100/30 bg-transparent border-0 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold font-mono">Synchronizing Feed Logs...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 space-y-3">
          <div className="bg-slate-50 p-4 rounded-full w-max mx-auto text-slate-400">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-700 text-sm">No notifications found</h3>
          <p className="text-slate-400 text-xs max-w-xs mx-auto">We'll alert you here when flatmates express interest in your listings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition ${
                n.isRead
                  ? 'bg-white border-slate-100/50 text-slate-600'
                  : 'bg-indigo-50/20 border-indigo-100/50 text-slate-800 font-medium shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-2 rounded-xl shrink-0 ${
                  n.isRead ? 'bg-slate-50 text-slate-400' : 'bg-indigo-100/60 text-indigo-600'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs leading-relaxed">{n.text}</p>
                  <div className="flex items-center space-x-1 text-[9px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteNotification(n.id)}
                title="Delete alert"
                className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-slate-50 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
