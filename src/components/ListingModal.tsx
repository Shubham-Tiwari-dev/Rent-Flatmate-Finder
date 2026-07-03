import React, { useState } from 'react';
import { Listing, InterestRequest } from '../types.js';
import { X, MapPin, Calendar, Bed, Sparkles, Send, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

interface ListingModalProps {
  listing: Listing;
  onClose: () => void;
  userRole: string;
  existingRequest: InterestRequest | null;
  onInterestSent: (newReq: InterestRequest) => void;
}

export const ListingModal: React.FC<ListingModalProps> = ({
  listing,
  onClose,
  userRole,
  existingRequest,
  onInterestSent,
}) => {
  const [interestMessage, setInterestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const match = listing.compatibility;

  const handleSendInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await axios.post('/api/interest', {
        listingId: listing.id,
        message: interestMessage,
      });
      onInterestSent(res.data);
      setInterestMessage('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit interest request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return { border: 'border-emerald-500', text: 'text-emerald-600', fill: 'bg-emerald-50' };
    if (score >= 60) return { border: 'border-indigo-500', text: 'text-indigo-600', fill: 'bg-indigo-50' };
    return { border: 'border-amber-500', text: 'text-amber-600', fill: 'bg-amber-50' };
  };

  const ringStyle = match ? getMatchScoreColor(match.score) : { border: 'border-slate-300', text: 'text-slate-600', fill: 'bg-slate-50' };

  const defaultPhoto = listing.photos && listing.photos.length > 0 
    ? listing.photos[0] 
    : `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23818cf8"/><stop offset="100%" stop-color="%234f46e5"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><text x="50%" y="50%" font-family="Arial" font-size="28" fill="white" font-weight="bold" text-anchor="middle">${listing.roomType} in ${listing.location}</text></svg>`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-600 hover:text-slate-800 p-2 rounded-full shadow-md border border-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Photo and Quick Info */}
        <div className="w-full md:w-1/2 bg-slate-50 flex flex-col relative h-[30vh] md:h-auto">
          <img
            src={defaultPhoto}
            alt={listing.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex flex-col justify-end p-6 md:p-8">
            <span className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white w-max rounded-full mb-2">
              {listing.roomType}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-snug">{listing.title}</h2>
            <p className="text-slate-200 text-sm flex items-center">
              <MapPin className="w-4 h-4 mr-1 shrink-0" />
              {listing.location}
            </p>
          </div>
        </div>

        {/* Right Side: Scrollable detailed specifications */}
        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto flex-grow max-h-[60vh] md:max-h-[90vh] flex flex-col">
          
          {/* Rent & Specs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Monthly Rent</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800">
                ${listing.rent}<span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Available Date</p>
              <p className="text-sm font-bold text-slate-800 flex items-center justify-end mt-1">
                <Calendar className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
                {new Date(listing.availableDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">About the Space</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{listing.description || 'No description provided.'}</p>
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 flex items-center space-x-3">
              <div className="bg-white p-2 rounded-xl text-slate-500 shadow-sm">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Room Count</p>
                <p className="text-xs font-bold text-slate-800">{listing.roomsCount} {listing.roomsCount === 1 ? 'Bedroom' : 'Bedrooms'}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 flex items-center space-x-3">
              <div className="bg-white p-2 rounded-xl text-slate-500 shadow-sm">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Furnishing</p>
                <p className="text-xs font-bold text-slate-800">{listing.furnishingStatus}</p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200/50"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact details */}
          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Direct Contact</h3>
            <p className="text-sm font-bold text-slate-800">{listing.contact}</p>
          </div>

          {/* AI Compatibility Panel (for tenants) */}
          {userRole === 'Tenant' && match && (
            <div className={`p-5 rounded-2xl mb-6 border ${ringStyle.border} ${ringStyle.fill}`}>
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-800">Gemini Compatibility Evaluation</h4>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-full border-4 ${ringStyle.border} flex items-center justify-center font-bold text-lg ${ringStyle.text} shrink-0 bg-white shadow-sm`}>
                  {match.score}%
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  <p>{match.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions & Requests Form (for tenants only) */}
          {userRole === 'Tenant' && (
            <div className="mt-auto pt-4 border-t border-slate-100">
              {existingRequest ? (
                // Request already sent
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {existingRequest.status === 'accepted' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : existingRequest.status === 'rejected' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Interest Request Sent</p>
                      <p className="text-[11px] text-slate-500 capitalize">Status: {existingRequest.status}</p>
                    </div>
                  </div>
                  {existingRequest.status === 'accepted' && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                      Unlocked Chat
                    </span>
                  )}
                </div>
              ) : (
                // Send interest form
                <form onSubmit={handleSendInterest} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Introduce Yourself to the Owner
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={interestMessage}
                      onChange={(e) => setInterestMessage(e.target.value)}
                      placeholder="Hi! I am super interested in this room and our profiles match incredibly well. I am clean and look forward to meeting you!"
                      className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none"
                    />
                  </div>
                  {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 px-4 rounded-2xl hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? 'Sending Request...' : 'Send Interest Request'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
