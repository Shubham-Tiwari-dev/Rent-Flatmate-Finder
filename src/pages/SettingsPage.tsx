import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Settings, User, Key, Server, HelpCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div id="settings-view" className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>System Settings</span>
        </h1>
        <p className="text-slate-500 text-xs font-medium">Verify your profile credentials, platform parameters, and API integration variables</p>
      </div>

      {/* Grid of panels */}
      <div className="space-y-6">
        
        {/* Panel 1: Credentials Info */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <User className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Account Credentials</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Registered Name</p>
              <p className="font-bold text-slate-700 mt-1">{user?.name}</p>
            </div>
            <div>
              <p className="text-slate-400">Email Address</p>
              <p className="font-bold text-slate-700 mt-1">{user?.email}</p>
            </div>
            <div>
              <p className="text-slate-400">Account Type / Authorization Role</p>
              <p className="font-bold text-slate-700 mt-1 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Panel 2: Google Gemini AI API Configuration Help */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <Key className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Google Gemini AI Integrations</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            RentMate uses the modern server-side Google Gemini SDK (`@google/genai`) to compute room compatibility analysis. 
            The system automatically injects your API key securely from your workspace secrets.
          </p>

          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 space-y-2">
            <h4 className="text-xs font-bold text-indigo-800 flex items-center space-x-1">
              <HelpCircle className="w-4 h-4" />
              <span>How to configure your API secret:</span>
            </h4>
            <ol className="list-decimal list-inside text-xs text-indigo-950 space-y-1 pl-1">
              <li>Open the <strong>Secrets Panel</strong> in Google AI Studio.</li>
              <li>Add a secret named <code>GEMINI_API_KEY</code>.</li>
              <li>Paste your Google AI Studio API key and save.</li>
            </ol>
            <p className="text-[10px] text-indigo-700 italic mt-2">Note: If no API key is set, RentMate automatically triggers fallback mathematical scoring, maintaining 100% operation.</p>
          </div>
        </div>

        {/* Panel 3: Technical system params */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <Server className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Sandbox Specifications</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
            <div>
              <p>Platform Ingress Port</p>
              <p className="font-mono font-bold text-slate-700 mt-0.5">3000</p>
            </div>
            <div>
              <p>Database Instance Driver</p>
              <p className="font-mono font-bold text-slate-700 mt-0.5">JSON-persisted db.json</p>
            </div>
            <div>
              <p>Real-time Client Protocol</p>
              <p className="font-mono font-bold text-slate-700 mt-0.5">Socket.IO (WebSocket)</p>
            </div>
            <div>
              <p>Server Environment Node</p>
              <p className="font-mono font-bold text-slate-700 mt-0.5">tsx server.ts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
