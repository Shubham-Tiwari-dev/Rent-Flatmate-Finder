import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Listing, InterestRequest } from '../types.js';
import { ListingCard } from '../components/ListingCard.js';
import { ListingModal } from '../components/ListingModal.js';
import { useAuth } from '../context/AuthContext.js';
import { Search, Filter, SlidersHorizontal, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface TenantDashboardProps {
  setCurrentPage: (page: string) => void;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({ setCurrentPage }) => {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    location: '',
    maxBudget: '',
    availableDate: '',
    roomType: 'Any',
    furnished: '',
    sortBy: 'Highest Compatibility',
  });

  // Active Selected Listing Modal
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [sentRequests, setSentRequests] = useState<InterestRequest[]>([]);

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (filters.location) params.location = filters.location;
      if (filters.maxBudget) params.maxBudget = filters.maxBudget;
      if (filters.availableDate) params.availableDate = filters.availableDate;
      if (filters.roomType && filters.roomType !== 'Any') params.roomType = filters.roomType;
      if (filters.furnished) params.furnished = filters.furnished;
      if (filters.sortBy) params.sortBy = filters.sortBy;

      const res = await axios.get('/api/listing', { params });
      setListings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to fetch rental listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const res = await axios.get('/api/tenant/requests');
      setSentRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load sent requests:', err);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [filters]);

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleResetFilters = () => {
    setFilters({
      location: '',
      maxBudget: '',
      availableDate: '',
      roomType: 'Any',
      furnished: '',
      sortBy: 'Highest Compatibility',
    });
  };

  const getExistingRequest = (listingId: string) => {
    return sentRequests.find((r) => r.listingId === listingId) || null;
  };

  const handleInterestSent = (newReq: InterestRequest) => {
    setSentRequests([...sentRequests, newReq]);
  };

  const isProfileIncomplete = !profile || !profile.preferredLocation || !profile.bio;

  return (
    <div id="tenant-dashboard" className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      
      {/* Welcome & Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Browse Match Listings</h1>
          <p className="text-slate-500 text-xs font-medium">Discover rooms matching your customized profile preferences</p>
        </div>

        {/* AI Filter Status */}
        {!isProfileIncomplete && (
          <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100/50 rounded-2xl px-4 py-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-indigo-800">Gemini Ranking Active</span>
          </div>
        )}
      </div>

      {/* Incomplete Profile Alert */}
      {isProfileIncomplete && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="bg-amber-100 text-amber-700 p-2.5 rounded-2xl shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">AI Compatibility Ranking is Limited</h3>
              <p className="text-xs text-slate-500 mt-0.5">Complete your tenant matching profile (budget, locations, lifestyle bio) to unlock full Gemini compatibility scores.</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('profile')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-2xl text-xs flex items-center justify-center space-x-1 shrink-0 self-start sm:self-center shadow-md shadow-amber-500/10"
          >
            <span>Complete Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filters Layout */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        
        {/* Core Location Search and Sorting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Search by neighborhood, city, or address..."
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3.5 pl-11 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              name="sortBy"
              value={filters.sortBy}
              onChange={handleFilterChange}
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium text-slate-700"
            >
              <option value="Highest Compatibility">Highest Compatibility</option>
              <option value="Lowest Rent">Lowest Rent</option>
              <option value="Newest">Newest Listings</option>
            </select>
          </div>
        </div>

        {/* Detailed filters dropdown section */}
        <div className="border-t border-slate-50 pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
          
          {/* Budget */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max Budget ($)</label>
            <input
              type="number"
              name="maxBudget"
              value={filters.maxBudget}
              onChange={handleFilterChange}
              placeholder="e.g. 1500"
              className="w-full text-xs bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Move-in Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Move-In Date</label>
            <input
              type="date"
              name="availableDate"
              value={filters.availableDate}
              onChange={handleFilterChange}
              className="w-full text-xs bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-600"
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Room Type</label>
            <select
              name="roomType"
              value={filters.roomType}
              onChange={handleFilterChange}
              className="w-full text-xs bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-600"
            >
              <option value="Any">Any Room Type</option>
              <option value="Single">Single Room</option>
              <option value="Shared">Shared Room</option>
              <option value="Studio">Studio Apartment</option>
              <option value="Entire Flat">Entire Flat</option>
            </select>
          </div>

          {/* Furnishing */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Furnishing</label>
            <select
              name="furnished"
              value={filters.furnished}
              onChange={handleFilterChange}
              className="w-full text-xs bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-600"
            >
              <option value="">Any Furnishing</option>
              <option value="Furnished">Furnished</option>
              <option value="Semi-Furnished">Semi-Furnished</option>
              <option value="Unfurnished">Unfurnished</option>
            </select>
          </div>
        </div>

        {/* Filters action summary */}
        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-4">
          <p>Showing {listings.length} matches</p>
          <button
            onClick={handleResetFilters}
            className="text-indigo-600 hover:underline font-bold bg-transparent border-0 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Grid displaying the matched room listings */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Computing AI Compatibility Ranks...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 p-8 space-y-4">
          <div className="bg-slate-50 p-4 rounded-full w-max mx-auto text-slate-400">
            <SlidersHorizontal className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-700">No rooms match your active filters</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">Try widening your budget, removing date requirements, or searching for broader neighborhoods.</p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => setSelectedListing(listing)}
            />
          ))}
        </div>
      )}

      {/* Listing details expanded modal overlay */}
      {selectedListing && (
        <ListingModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          userRole="Tenant"
          existingRequest={getExistingRequest(selectedListing.id)}
          onInterestSent={handleInterestSent}
        />
      )}
    </div>
  );
};
