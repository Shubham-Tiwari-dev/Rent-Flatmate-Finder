import React, { useState } from 'react';
import { X, Plus, Trash2, Home } from 'lucide-react';
import axios from 'axios';
import { Listing } from '../types.js';

interface NewListingModalProps {
  onClose: () => void;
  onListingCreated: (newListing: Listing) => void;
}

const AMENITY_PRESETS = [
  'High-speed Wi-Fi',
  'Private Bathroom',
  'Air Conditioning',
  'Washing Machine',
  'Gym Access',
  'Fully Equipped Kitchen',
  'Balcony',
  'Parking Space',
  'Shared Lounge',
];

export const NewListingModal: React.FC<NewListingModalProps> = ({ onClose, onListingCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    rent: '',
    availableDate: new Date().toISOString().split('T')[0],
    roomType: 'Single',
    furnishingStatus: 'Semi-Furnished',
    roomsCount: '1',
    contact: '',
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photosList, setPhotosList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleAddPhoto = () => {
    if (photoUrl.trim()) {
      setPhotosList([...photosList, photoUrl.trim()]);
      setPhotoUrl('');
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotosList(photosList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...formData,
        rent: Number(formData.rent),
        roomsCount: Number(formData.roomsCount),
        amenities: selectedAmenities,
        photos: photosList,
      };

      const res = await axios.post('/api/listing', payload);
      onListingCreated(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="border-b border-slate-100 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">Add Room Listing</h2>
              <p className="text-slate-400 text-xs font-medium">Publish your space for prospective tenants</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 md:p-8 space-y-6 flex-grow">
          {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

          {/* Title & Rent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Listing Title*</label>
              <input
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Cozy Studio near Central Park"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Monthly Rent ($)*</label>
              <input
                required
                type="number"
                name="rent"
                value={formData.rent}
                onChange={handleChange}
                placeholder="1200"
                min="1"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Provide a welcoming description of the room, flatmate expectations, and building environment..."
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Location & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Location / Address*</label>
              <input
                required
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Manhattan, New York"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contact Details*</label>
              <input
                required
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="Call +1-555-0199 or email@example.com"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Room Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Room Type*</label>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={handleChange}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="Single">Single Room</option>
                <option value="Shared">Shared Room</option>
                <option value="Studio">Studio Apartment</option>
                <option value="Entire Flat">Entire Flat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Furnishing*</label>
              <select
                name="furnishingStatus"
                value={formData.furnishingStatus}
                onChange={handleChange}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="Furnished">Furnished</option>
                <option value="Semi-Furnished">Semi-Furnished</option>
                <option value="Unfurnished">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Total Rooms*</label>
              <input
                required
                type="number"
                name="roomsCount"
                value={formData.roomsCount}
                onChange={handleChange}
                min="1"
                placeholder="1"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Available Date*</label>
              <input
                required
                type="date"
                name="availableDate"
                value={formData.availableDate}
                onChange={handleChange}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Amenities Preset Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Amenities</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITY_PRESETS.map((amenity, idx) => {
                const checked = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleAmenity(amenity)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between ${
                      checked
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <span>{amenity}</span>
                    <span className={`w-2 h-2 rounded-full ${checked ? 'bg-indigo-600' : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo URL inputs */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Listing Photo URLs</label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-grow text-sm bg-slate-50 border border-slate-100 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 px-4 rounded-2xl text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
            
            {/* Added Photos Grid */}
            {photosList.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {photosList.map((url, idx) => (
                  <div key={idx} className="relative h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={url} alt="Room upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="border-t border-slate-100 pt-5 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-2xl shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
