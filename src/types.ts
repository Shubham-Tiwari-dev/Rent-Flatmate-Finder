export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Tenant' | 'Owner' | 'Admin';
  createdAt: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  location: string;
  rent: number;
  availableDate: string;
  roomType: 'Single' | 'Shared' | 'Studio' | 'Entire Flat';
  furnishingStatus: 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
  roomsCount: number;
  photos: string[];
  amenities: string[];
  contact: string;
  isFilled: boolean;
  createdAt: string;
  compatibility?: {
    score: number;
    explanation: string;
  };
}

export interface Profile {
  id: string;
  tenantId: string;
  preferredLocation: string;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  roomTypePreference: 'Single' | 'Shared' | 'Studio' | 'Entire Flat' | 'Any';
  bio: string;
  createdAt: string;
}

export interface CompatibilityScore {
  id: string;
  listingId: string;
  tenantId: string;
  score: number;
  explanation: string;
  createdAt: string;
}

export interface InterestRequest {
  id: string;
  listingId: string;
  tenantId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  createdAt: string;
  listing?: Listing | null;
  tenant?: { id: string; name: string; email: string } | null;
  profile?: Profile | null;
  compatibility?: { score: number; explanation: string } | null;
}

export interface Chat {
  id: string;
  listingId: string;
  tenantId: string;
  ownerId: string;
  createdAt: string;
  listing?: Listing | null;
  owner?: { id: string; name: string } | null;
  tenant?: { id: string; name: string } | null;
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}
