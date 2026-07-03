import React from 'react';
import { Listing } from '../types.js';
import { MapPin, Calendar, Bed, Sparkles, Building2 } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  onClick: (listing: Listing) => void;
  showMatch?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick, showMatch = true }) => {
  const match = listing.compatibility;

  // Determine color matching for the AI gauge
  const getMatchColor = (score: number) => {
    if (score >= 80) return { stroke: 'stroke-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    if (score >= 60) return { stroke: 'stroke-indigo-500', bg: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
    return { stroke: 'stroke-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-100' };
  };

  const scoreDetails = match ? getMatchColor(match.score) : { stroke: 'stroke-slate-300', bg: 'bg-slate-50 text-slate-600' };

  // Calculate standard available date string format
  const formattedDate = () => {
    try {
      return new Date(listing.availableDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return listing.availableDate;
    }
  };

  // Generate a premium ambient pattern-based visual photo as placeholder if empty
  const defaultPhoto = listing.photos && listing.photos.length > 0 
    ? listing.photos[0] 
    : `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23818cf8"/><stop offset="100%" stop-color="%234f46e5"/></linearGradient></defs><rect width="400" height="300" fill="url(%23g)"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" font-weight="bold" text-anchor="middle">${listing.roomType} in ${listing.location}</text></svg>`;

  return (
    <article 
      id={`card-${listing.id}`}
      onClick={() => onClick(listing)}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200/80 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full group"
    >
      {/* Listing Image */}
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img
          src={defaultPhoto}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 text-xs font-semibold bg-white/90 backdrop-blur-sm rounded-full text-slate-800 shadow-sm border border-slate-100">
            {listing.roomType}
          </span>
        </div>
        
        {/* Rent tag */}
        <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1.5 rounded-2xl">
          <span className="text-sm font-semibold tracking-tight">$</span>
          <span className="text-lg font-bold">{listing.rent}</span>
          <span className="text-[10px] text-slate-300">/mo</span>
        </div>

        {/* AI Compatibility score badge */}
        {showMatch && match && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl flex items-center space-x-1.5 shadow-md border border-slate-100">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">{match.score}% Match</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between space-x-2">
          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition duration-200 line-clamp-1">
            {listing.title}
          </h3>
        </div>

        {/* Location */}
        <div className="flex items-center text-slate-500 text-sm mt-2">
          <MapPin className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          <span className="line-clamp-1">{listing.location}</span>
        </div>

        {/* Room specifications */}
        <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/50 text-xs text-slate-600 font-medium">
          <div className="flex items-center">
            <Bed className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <span>{listing.roomsCount} {listing.roomsCount === 1 ? 'Room' : 'Rooms'}</span>
          </div>
          <div className="flex items-center">
            <Building2 className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <span>{listing.furnishingStatus}</span>
          </div>
        </div>

        {/* Action / Availability footer */}
        <div className="flex items-center justify-between border-t border-slate-100 mt-auto pt-4 text-xs text-slate-400">
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span>Available {formattedDate()}</span>
          </div>
          <span className="font-semibold text-indigo-600 group-hover:translate-x-1 transition duration-200">
            View details →
          </span>
        </div>
      </div>
    </article>
  );
};
