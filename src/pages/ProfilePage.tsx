import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { User, Sparkles, Check, Save } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  
  // Set default form values with fallback
  const [formData, setFormData] = useState({
    preferredLocation: profile?.preferredLocation || '',
    budgetMin: profile?.budgetMin ? String(profile.budgetMin) : '500',
    budgetMax: profile?.budgetMax ? String(profile.budgetMax) : '2000',
    moveInDate: profile?.moveInDate ? profile.moveInDate.split('T')[0] : new Date().toISOString().split('T')[0],
    roomTypePreference: profile?.roomTypePreference || 'Any',
    bio: profile?.bio || '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await updateProfile({
        preferredLocation: formData.preferredLocation,
        budgetMin: Number(formData.budgetMin),
        budgetMax: Number(formData.budgetMax),
        moveInDate: formData.moveInDate,
        roomTypePreference: formData.roomTypePreference as any,
        bio: formData.bio,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to preserve profile specifications.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="profile-customizer" className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
          <User className="w-6 h-6 text-indigo-600" />
          <span>My Flatmate Profile</span>
        </h1>
        <p className="text-slate-500 text-xs font-medium">Fine-tune your rental search parameters to guide the Google Gemini matching scoring engine</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
        
        {/* Banner highlighting Gemini integration */}
        <div className="bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4 flex items-start space-x-3.5 mb-8">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="text-xs font-bold text-indigo-800">Gemini AI Prompt-Matching Optimization</h4>
            <p className="text-xs text-indigo-950 mt-0.5">Your biography (work schedule, neatness preferences, quiet hour demands) is directly fed into Gemini. Be as descriptive as possible to attract listings with 90%+ compatibility!</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl p-4 text-center font-semibold mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-2xl p-4 text-center font-semibold mb-6 flex items-center justify-center space-x-1">
            <Check className="w-4 h-4" />
            <span>Profile criteria saved successfully! Gemini matches updated.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Preferred Location */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Preferred Location / City*</label>
            <input
              required
              type="text"
              name="preferredLocation"
              value={formData.preferredLocation}
              onChange={handleChange}
              placeholder="e.g. Brooklyn, New York"
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Budget Min & Max */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Minimum Budget (₹/mo)</label>
              <input
                required
                type="number"
                name="budgetMin"
                value={formData.budgetMin}
                onChange={handleChange}
                placeholder="500"
                min="0"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Maximum Budget (₹/mo)</label>
              <input
                required
                type="number"
                name="budgetMax"
                value={formData.budgetMax}
                onChange={handleChange}
                placeholder="2000"
                min="0"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Target Move-In Date & Room Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Move-In Date</label>
              <input
                required
                type="date"
                name="moveInDate"
                value={formData.moveInDate}
                onChange={handleChange}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Room Type Preference</label>
              <select
                name="roomTypePreference"
                value={formData.roomTypePreference}
                onChange={handleChange}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-600"
              >
                <option value="Any">Any Room Type</option>
                <option value="Single">Single Room</option>
                <option value="Shared">Shared Room</option>
                <option value="Studio">Studio Apartment</option>
                <option value="Entire Flat">Entire Flat</option>
              </select>
            </div>
          </div>

          {/* Biography Bio description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">About Me / Lifestyle Biography*</label>
            <textarea
              required
              name="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell owners about your daily schedule, hobbies, attitude towards cleanliness, rules regarding overnight guests, pets, and any specific flatmate dynamic you want to build."
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Submit CTA */}
          <div className="border-t border-slate-100 pt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Preserving changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
