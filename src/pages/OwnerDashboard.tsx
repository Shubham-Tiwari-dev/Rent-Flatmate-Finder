import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Listing, InterestRequest } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { ListingCard } from '../components/ListingCard.js';
import { NewListingModal } from '../components/NewListingModal.js';
import { Plus, Users, Sparkles, AlertCircle, Check, X, Eye, FileText, Trash2, Home } from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<InterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsError, setListingsError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setListingsError('');
    try {
      const [listingsRes, requestsRes] = await Promise.all([
        axios.get('/api/listing'),
        axios.get('/api/owner/requests'),
      ]);

      // Filter listings only owned by this owner
      const listingsData = Array.isArray(listingsRes.data) ? listingsRes.data : [];
      const requestsData = Array.isArray(requestsRes.data) ? requestsRes.data : [];

      const filteredListings = listingsData.filter((l: Listing) => l.ownerId === user?.id);
      setMyListings(filteredListings);
      setRequests(requestsData);
    } catch (err) {
      setListingsError('Failed to synchronize owner dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleFilled = async (listingId: string, currentStatus: boolean) => {
    try {
      const res = await axios.put(`/api/listing/${listingId}`, {
        isFilled: !currentStatus,
      });
      setMyListings(myListings.map((l) => (l.id === listingId ? res.data : l)));
    } catch (err) {
      console.error('Failed to change listing filled status:', err);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    try {
      await axios.delete(`/api/listing/${listingId}`);
      setMyListings(myListings.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error('Failed to delete listing:', err);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await axios.put(`/api/interest/${requestId}`, { status });
      // Update local state
      setRequests(requests.map((r) => (r.id === requestId ? { ...r, status: res.data.status } : r)));
    } catch (err) {
      console.error('Failed to respond to interest request:', err);
    }
  };

  const handleListingCreated = (newListing: Listing) => {
    setMyListings([newListing, ...myListings]);
    setShowAddModal(false);
  };

  return (
    <div id="owner-dashboard" className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Owner Dashboard</h1>
          <p className="text-slate-500 text-xs font-medium">Manage your listed rooms and evaluate interested tenant profiles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-100 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Room</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Synchronizing Dashboard Metrics...</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Section: Listings Management */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center space-x-2">
              <Home className="w-5 h-5 text-indigo-600" />
              <span>Active Room Listings ({myListings.length})</span>
            </h2>

            {listingsError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl p-4 text-center font-semibold">
                {listingsError}
              </div>
            )}

            {myListings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-8 space-y-3">
                <div className="bg-slate-50 p-4 rounded-full w-max mx-auto text-slate-400">
                  <Home className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">No active listings published</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">Publish your spare bedroom or flat to let tenants compute compatibility scores.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Create Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((listing) => (
                  <div key={listing.id} className="relative group/wrapper">
                    {/* Embedded Filled Banner */}
                    {listing.isFilled && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] z-10 rounded-3xl flex items-center justify-center text-center p-4">
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100">
                          <p className="text-xs font-black text-slate-800 tracking-tight uppercase">Room Filled</p>
                          <p className="text-[10px] text-slate-400 font-medium">Deactivated from public search</p>
                        </div>
                      </div>
                    )}
                    
                    <ListingCard listing={listing} onClick={() => {}} showMatch={false} />

                    {/* Owner Management Controls Layer */}
                    <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 opacity-0 group-hover/wrapper:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleToggleFilled(listing.id, listing.isFilled)}
                        title={listing.isFilled ? 'Mark Available' : 'Mark Filled'}
                        className={`p-2 rounded-xl border shadow-sm text-xs font-bold ${
                          listing.isFilled
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100'
                        }`}
                      >
                        {listing.isFilled ? 'Reopen' : 'Fill'}
                      </button>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        title="Delete Listing"
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Interested Tenants List */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Interested Tenant Applications ({requests.length})</span>
            </h2>

            {requests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-8 text-slate-400 text-xs">
                No tenant interest requests received yet. Listings with high AI scores typically match faster!
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => {
                  const score = req.compatibility?.score || 0;
                  const isHighMatch = score >= 80;
                  const isExpanded = expandedExplanation === req.id;

                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4"
                    >
                      {/* Tenant Header and Compatibility Ring */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          {/* Circle Gauge */}
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-center font-bold text-xs shrink-0 shadow-sm ${
                            score >= 80 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : score >= 60 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            <span className="text-base font-black">{score}%</span>
                            <span className="text-[8px] font-semibold uppercase">Match</span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-800 text-base">{req.tenant?.name}</h3>
                            <p className="text-xs text-slate-400">
                              Applied for: <span className="font-semibold text-slate-600">"{req.listing?.title}"</span>
                            </p>
                          </div>
                        </div>

                        {/* Status / Actions */}
                        <div className="flex items-center space-x-2 self-start md:self-center">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleUpdateRequestStatus(req.id, 'accepted')}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
                              >
                                <Check className="w-4 h-4" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleUpdateRequestStatus(req.id, 'rejected')}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
                              >
                                <X className="w-4 h-4" />
                                <span>Decline</span>
                              </button>
                            </>
                          ) : (
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              req.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {req.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Application Message */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tenant message</p>
                        <p className="text-xs text-slate-700 leading-relaxed italic">"{req.message || 'No introductory message provided.'}"</p>
                      </div>

                      {/* Tenant Preferences Specs Block */}
                      {req.profile && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                          <div>
                            <p className="text-slate-400">Preferred Location</p>
                            <p className="font-bold text-slate-700">{req.profile.preferredLocation || 'Anywhere'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Budget Limit</p>
                            <p className="font-bold text-slate-700">${req.profile.budgetMin} - ${req.profile.budgetMax}/mo</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Room Preference</p>
                            <p className="font-bold text-slate-700">{req.profile.roomTypePreference}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Tenant Biography</p>
                            <p className="font-bold text-slate-700 truncate" title={req.profile.bio}>{req.profile.bio || 'None'}</p>
                          </div>
                        </div>
                      )}

                      {/* AI Explanation Accordion Control */}
                      {req.compatibility && (
                        <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between">
                          <button
                            onClick={() => setExpandedExplanation(isExpanded ? null : req.id)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 bg-transparent border-0 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Hide Match Explanation' : 'View Gemini AI Match Explanation'}</span>
                          </button>
                        </div>
                      )}

                      {/* Expanded Accordion content */}
                      {isExpanded && req.compatibility && (
                        <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl text-xs text-indigo-950 leading-relaxed mt-2 flex items-start space-x-3 animate-fade-in">
                          <AlertCircle className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
                          <p>{req.compatibility.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Listing Form Modal */}
      {showAddModal && (
        <NewListingModal
          onClose={() => setShowAddModal(false)}
          onListingCreated={handleListingCreated}
        />
      )}
    </div>
  );
};
