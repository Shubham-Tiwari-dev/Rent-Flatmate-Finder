import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, User, Listing, Profile } from './db.js';
import { authenticateToken, AuthenticatedRequest, JWT_SECRET, requireRole } from './middleware.js';
import { computeAICompatibility } from './gemini.js';
import { notifyOwnerOfInterest, notifyTenantOfRequestUpdate } from './email.js';

const router = Router();

// ====================================================
// AUTHENTICATION ROUTES
// ====================================================

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide name, email, password, and role' });
    }

    if (role !== 'Tenant' && role !== 'Owner' && role !== 'Admin') {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Check if email already registered
    const existing = await db.users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.users.create({
      name,
      email,
      passwordHash,
      role,
      isSuspended: false,
    });

    // Create default profile for tenant
    if (role === 'Tenant') {
      await db.profiles.create({
        tenantId: newUser.id,
        preferredLocation: '',
        budgetMin: 0,
        budgetMax: 2000,
        moveInDate: new Date().toISOString().split('T')[0],
        roomTypePreference: 'Any',
        bio: '',
      });
    }

    // Sign Token
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await db.users.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await db.users.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const responseData: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    if (user.role === 'Tenant') {
      responseData.profile = await db.profiles.findOne({ tenantId: user.id });
    }

    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /profile - Update tenant profile
router.put('/profile', authenticateToken, requireRole('Tenant'), async (req: AuthenticatedRequest, res) => {
  try {
    const { preferredLocation, budgetMin, budgetMax, moveInDate, roomTypePreference, bio } = req.body;

    const profile = await db.profiles.findOne({ tenantId: req.user!.id });
    if (!profile) {
      const newProfile = await db.profiles.create({
        tenantId: req.user!.id,
        preferredLocation: preferredLocation || '',
        budgetMin: Number(budgetMin) || 0,
        budgetMax: Number(budgetMax) || 2000,
        moveInDate: moveInDate || new Date().toISOString().split('T')[0],
        roomTypePreference: roomTypePreference || 'Any',
        bio: bio || '',
      });
      return res.json(newProfile);
    }

    const updatedProfile = await db.profiles.findByIdAndUpdate(profile.id, {
      preferredLocation: preferredLocation !== undefined ? preferredLocation : profile.preferredLocation,
      budgetMin: budgetMin !== undefined ? Number(budgetMin) : profile.budgetMin,
      budgetMax: budgetMax !== undefined ? Number(budgetMax) : profile.budgetMax,
      moveInDate: moveInDate !== undefined ? moveInDate : profile.moveInDate,
      roomTypePreference: roomTypePreference !== undefined ? roomTypePreference : profile.roomTypePreference,
      bio: bio !== undefined ? bio : profile.bio,
    });

    res.json(updatedProfile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// LISTINGS ROUTES
// ====================================================

// POST /listing - Create listing (Owner only)
router.post('/listing', authenticateToken, requireRole('Owner'), async (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, location, rent, availableDate, roomType, furnishingStatus, roomsCount, photos, amenities, contact } = req.body;

    if (!title || !location || !rent || !availableDate || !roomType || !furnishingStatus || !contact) {
      return res.status(400).json({ error: 'Please provide all required listing details' });
    }

    const newListing = await db.listings.create({
      ownerId: req.user!.id,
      title,
      description: description || '',
      location,
      rent: Number(rent),
      availableDate,
      roomType,
      furnishingStatus,
      roomsCount: Number(roomsCount) || 1,
      photos: photos || [],
      amenities: amenities || [],
      contact,
    });

    res.status(201).json(newListing);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /listing - Browse listings with sorting, filters, and AI ranking
router.get('/listing', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { location, maxBudget, availableDate, roomType, furnished, sortBy } = req.query;

    let listings = await db.listings.find({ isFilled: false });

    // Filter filled listings automatically (this is already active above)

    // Filter: Location (case-insensitive partial match)
    if (location) {
      const locStr = String(location).toLowerCase();
      listings = listings.filter((l) => l.location.toLowerCase().includes(locStr));
    }

    // Filter: Budget
    if (maxBudget) {
      const budget = Number(maxBudget);
      listings = listings.filter((l) => l.rent <= budget);
    }

    // Filter: Available Date (Listing available date should be on or before the queried date, i.e., available by then)
    if (availableDate) {
      const filterDate = new Date(String(availableDate)).getTime();
      listings = listings.filter((l) => new Date(l.availableDate).getTime() <= filterDate);
    }

    // Filter: Room Type
    if (roomType && roomType !== 'Any') {
      listings = listings.filter((l) => l.roomType === roomType);
    }

    // Filter: Furnished
    if (furnished) {
      listings = listings.filter((l) => l.furnishingStatus === furnished);
    }

    // If user is a Tenant, let's prepare and pre-attach compatibility scores
    const tenantProfile = req.user!.role === 'Tenant' ? await db.profiles.findOne({ tenantId: req.user!.id }) : null;
    const scoredListings: Array<Listing & { compatibility?: { score: number; explanation: string } }> = [];

    for (const listing of listings) {
      let compatibilityInfo: { score: number; explanation: string } | undefined = undefined;

      if (tenantProfile) {
        // Look up saved score first to satisfy "Do NOT recompute repeatedly. Save into MongoDB"
        const savedScore = await db.compatibilityScores.findOne({ listingId: listing.id, tenantId: req.user!.id });
        if (savedScore) {
          compatibilityInfo = {
            score: savedScore.score,
            explanation: savedScore.explanation,
          };
        } else {
          // Compute on-the-fly and save (happens lazily when they view list)
          const result = await computeAICompatibility(listing, tenantProfile);
          await db.compatibilityScores.create({
            listingId: listing.id,
            tenantId: req.user!.id,
            score: result.score,
            explanation: result.explanation,
          });
          compatibilityInfo = result;
        }
      }

      scoredListings.push({
        ...listing,
        compatibility: compatibilityInfo,
      });
    }

    // Sorting Logic
    if (sortBy === 'Lowest Rent') {
      scoredListings.sort((a, b) => a.rent - b.rent);
    } else if (sortBy === 'Newest') {
      scoredListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // Default / "Highest Compatibility"
      if (tenantProfile) {
        scoredListings.sort((a, b) => (b.compatibility?.score || 0) - (a.compatibility?.score || 0));
      } else {
        scoredListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }

    res.json(scoredListings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /listing/:id - Edit listing (Owner only)
router.put('/listing/:id', authenticateToken, requireRole('Owner'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, rent, availableDate, roomType, furnishingStatus, roomsCount, photos, amenities, contact, isFilled } = req.body;

    const listing = await db.listings.findById(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.ownerId !== req.user!.id) return res.status(403).json({ error: 'Unauthorized to modify this listing' });

    const updatedListing = await db.listings.findByIdAndUpdate(id, {
      title: title !== undefined ? title : listing.title,
      description: description !== undefined ? description : listing.description,
      location: location !== undefined ? location : listing.location,
      rent: rent !== undefined ? Number(rent) : listing.rent,
      availableDate: availableDate !== undefined ? availableDate : listing.availableDate,
      roomType: roomType !== undefined ? roomType : listing.roomType,
      furnishingStatus: furnishingStatus !== undefined ? furnishingStatus : listing.furnishingStatus,
      roomsCount: roomsCount !== undefined ? Number(roomsCount) : listing.roomsCount,
      photos: photos !== undefined ? photos : listing.photos,
      amenities: amenities !== undefined ? amenities : listing.amenities,
      contact: contact !== undefined ? contact : listing.contact,
      isFilled: isFilled !== undefined ? isFilled : listing.isFilled,
    });

    res.json(updatedListing);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /listing/:id - Delete listing (Owner or Admin)
router.delete('/listing/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const listing = await db.listings.findById(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (req.user!.role !== 'Admin' && listing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this listing' });
    }

    await db.listings.deleteOne(id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// COMPATIBILITY API
// ====================================================

// GET /compatibility/:listingId - Retrieve score for profile
router.get('/compatibility/:listingId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { listingId } = req.params;
    const tenantId = req.user!.role === 'Tenant' ? req.user!.id : String(req.query.tenantId || '');

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const listing = await db.listings.findById(listingId);
    const profile = await db.profiles.findOne({ tenantId });

    if (!listing || !profile) {
      return res.status(404).json({ error: 'Listing or Tenant profile not found' });
    }

    let scoreObj = await db.compatibilityScores.findOne({ listingId, tenantId });
    if (!scoreObj) {
      // Calculate, save and return
      const result = await computeAICompatibility(listing, profile);
      scoreObj = await db.compatibilityScores.create({
        listingId,
        tenantId,
        score: result.score,
        explanation: result.explanation,
      });
    }

    res.json(scoreObj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// INTEREST & REQUESTS
// ====================================================

// POST /interest - Send interest request (Tenant only)
router.post('/interest', authenticateToken, requireRole('Tenant'), async (req: AuthenticatedRequest, res) => {
  try {
    const { listingId, message } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID required' });
    }

    const listing = await db.listings.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.isFilled) return res.status(400).json({ error: 'This room is already filled' });

    const tenantUser = await db.users.findById(req.user!.id);
    if (!tenantUser) return res.status(404).json({ error: 'Tenant user not found' });

    const profile = await db.profiles.findOne({ tenantId: req.user!.id });
    if (!profile) return res.status(400).json({ error: 'Please create your profile first' });

    // Create Interest Request
    const request = await db.interestRequests.create({
      listingId,
      tenantId: req.user!.id,
      message: message || '',
    });

    // Compute compatibility score to notify owner about score
    let score = 70; // default/fallback average
    let savedScore = await db.compatibilityScores.findOne({ listingId, tenantId: req.user!.id });
    if (!savedScore) {
      const calc = await computeAICompatibility(listing, profile);
      savedScore = await db.compatibilityScores.create({
        listingId,
        tenantId: req.user!.id,
        score: calc.score,
        explanation: calc.explanation,
      });
    }
    score = savedScore.score;

    // Fetch Owner User details
    const ownerUser = await db.users.findById(listing.ownerId);
    if (ownerUser) {
      // Create system notification for owner
      await db.notifications.create({
        userId: ownerUser.id,
        text: `Tenant ${tenantUser.name} is interested in your listing: "${listing.title}". Match score: ${score}%.`,
      });

      // Send Email notifications
      await notifyOwnerOfInterest(
        ownerUser.email,
        ownerUser.name,
        listing.title,
        tenantUser.name,
        score
      );
    }

    res.status(201).json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /interest/:id - Accept or Reject request (Owner only)
router.put('/interest/:id', authenticateToken, requireRole('Owner'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' | 'rejected'

    if (status !== 'accepted' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be accepted or rejected' });
    }

    const request = await db.interestRequests.findById(id);
    if (!request) return res.status(404).json({ error: 'Interest request not found' });

    const listing = await db.listings.findById(request.listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to respond to this request' });
    }

    const updatedRequest = await db.interestRequests.findByIdAndUpdate(id, { status });

    // Handle updates
    const tenantUser = await db.users.findById(request.tenantId);
    if (tenantUser) {
      // Create system notification
      await db.notifications.create({
        userId: tenantUser.id,
        text: `Your interest request for listing "${listing.title}" has been ${status.toUpperCase()} by the owner.`,
      });

      // If accepted, initiate a safe Chat channel automatically
      if (status === 'accepted') {
        await db.chats.create({
          listingId: listing.id,
          tenantId: request.tenantId,
          ownerId: req.user!.id,
        });
      }

      // Send Email notification
      await notifyTenantOfRequestUpdate(
        tenantUser.email,
        tenantUser.name,
        listing.title,
        status
      );
    }

    res.json(updatedRequest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /owner/requests - Get requests for an owner's listings
router.get('/owner/requests', authenticateToken, requireRole('Owner'), async (req: AuthenticatedRequest, res) => {
  try {
    const listings = await db.listings.find({ ownerId: req.user!.id });
    const listingIds = listings.map((l) => l.id);

    const allRequests = await db.interestRequests.find();
    const requests = allRequests.filter((r) => listingIds.includes(r.listingId));

    // Enhance requests with listing and tenant user info
    const enhanced = await Promise.all(requests.map(async (reqItem) => {
      const listing = listings.find((l) => l.id === reqItem.listingId);
      const tenantUser = await db.users.findById(reqItem.tenantId);
      const scoreObj = await db.compatibilityScores.findOne({ listingId: reqItem.listingId, tenantId: reqItem.tenantId });
      const profile = await db.profiles.findOne({ tenantId: reqItem.tenantId });

      return {
        ...reqItem,
        listing: listing || null,
        tenant: tenantUser ? { id: tenantUser.id, name: tenantUser.name, email: tenantUser.email } : null,
        profile: profile || null,
        compatibility: scoreObj ? { score: scoreObj.score, explanation: scoreObj.explanation } : null,
      };
    }));

    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tenant/requests - Get sent requests for tenant
router.get('/tenant/requests', authenticateToken, requireRole('Tenant'), async (req: AuthenticatedRequest, res) => {
  try {
    const requests = await db.interestRequests.find({ tenantId: req.user!.id });

    const enhanced = await Promise.all(requests.map(async (reqItem) => {
      const listing = await db.listings.findById(reqItem.listingId);
      const scoreObj = await db.compatibilityScores.findOne({ listingId: reqItem.listingId, tenantId: reqItem.tenantId });

      return {
        ...reqItem,
        listing: listing || null,
        compatibility: scoreObj ? { score: scoreObj.score, explanation: scoreObj.explanation } : null,
      };
    }));

    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// REAL-TIME CHAT ENDPOINTS
// ====================================================

// GET /chat - Get all chat sessions
router.get('/chat', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id, role } = req.user!;
    let chatsList = [];

    if (role === 'Tenant') {
      chatsList = await db.chats.find({ tenantId: id });
    } else if (role === 'Owner') {
      chatsList = await db.chats.find({ ownerId: id });
    } else {
      chatsList = await db.chats.find(); // Admin sees all
    }

    const enhanced = await Promise.all(chatsList.map(async (chat) => {
      const listing = await db.listings.findById(chat.listingId);
      const ownerUser = await db.users.findById(chat.ownerId);
      const tenantUser = await db.users.findById(chat.tenantId);
      const messages = await db.messages.find({ chatId: chat.id });
      const lastMessage = messages[messages.length - 1] || null;
      const unreadCount = messages.filter((m) => m.senderId !== id && !m.isRead).length;

      return {
        ...chat,
        listing: listing || null,
        owner: ownerUser ? { id: ownerUser.id, name: ownerUser.name } : null,
        tenant: tenantUser ? { id: tenantUser.id, name: tenantUser.name } : null,
        lastMessage,
        unreadCount,
      };
    }));

    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /chat/:id/messages - Get messages in a chat session
router.get('/chat/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const allChats = await db.chats.find();
    const chat = allChats.find((c) => c.id === id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Enforce authorization
    if (req.user!.role !== 'Admin' && chat.tenantId !== userId && chat.ownerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this chat' });
    }

    // Mark as read
    await db.messages.markAsRead(id, userId);

    const messages = await db.messages.find({ chatId: id });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /chat/:id/message - Send a message via REST API (fallback for WebSocket)
router.post('/chat/:id/message', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const senderId = req.user!.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    const allChats = await db.chats.find();
    const chat = allChats.find((c) => c.id === id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (chat.tenantId !== senderId && chat.ownerId !== senderId) {
      return res.status(403).json({ error: 'Unauthorized to send message' });
    }

    const newMessage = await db.messages.create({
      chatId: id,
      senderId,
      text,
    });

    res.status(201).json(newMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// NOTIFICATIONS API
// ====================================================

// GET /notifications
router.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await db.notifications.find({ userId: req.user!.id });
    // Sort by newest first
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /notifications/read
router.put('/notifications/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await db.notifications.markAllAsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// ADMIN SPECIFIC ROUTES
// ====================================================

// GET /admin/stats - Platform Statistics
router.get('/admin/stats', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await db.getStats();

    // Compile recent activities
    const recentUsers = await db.users.find();
    recentUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const recentListings = await db.listings.find();
    recentListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const recentRequests = await db.interestRequests.find();
    recentRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const requestsSlice = recentRequests.slice(0, 5);
    const enhancedRequests = await Promise.all(requestsSlice.map(async (r) => {
      const listing = await db.listings.findById(r.listingId);
      const tenant = await db.users.findById(r.tenantId);
      return {
        id: r.id,
        listingTitle: listing?.title || 'Unknown Room',
        tenantName: tenant?.name || 'Unknown User',
        status: r.status,
        createdAt: r.createdAt,
      };
    }));

    res.json({
      stats,
      recentUsers: recentUsers.slice(0, 5).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, isSuspended: u.isSuspended })),
      recentListings: recentListings.slice(0, 5),
      recentRequests: enhancedRequests,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/users - List users
router.get('/admin/users', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const allUsers = await db.users.find();
    const safeUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isSuspended: u.isSuspended,
      createdAt: u.createdAt,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/users/:id/suspend - Suspend User
router.put('/admin/users/:id/suspend', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const user = await db.users.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'Admin') return res.status(400).json({ error: 'Cannot suspend an Administrator' });

    const updated = await db.users.findByIdAndUpdate(id, { isSuspended: !!isSuspended });
    res.json({ message: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/users/:id - Delete User
router.delete('/admin/users/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.users.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'Admin') return res.status(400).json({ error: 'Cannot delete an Administrator' });

    await db.users.deleteOne(id);
    // Cleanup listings or requests of deleted users
    if (user.role === 'Owner') {
      const ownerListings = await db.listings.find({ ownerId: id });
      await Promise.all(ownerListings.map((l) => db.listings.deleteOne(l.id)));
    } else {
      const tenantProfile = await db.profiles.findOne({ tenantId: id });
      if (tenantProfile) {
        await db.profiles.deleteOne(tenantProfile.id);
      }
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
