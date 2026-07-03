# Rent & Flatmate Finder (with AI Compatibility & Live Chat)

Rent & Flatmate Finder is a full-stack web application designed to match tenants and owners using Gemini AI for roommate/listing compatibility, alongside a real-time private chat platform powered by Socket.IO. It enables owners to publish listings and manage interest requests, while tenants can search, filter, and instantly evaluate compatibility with prospective rooms.

---

## 🛠️ System Design & Architecture

The application is built on a full-stack architecture with a React-Vite client and a custom Express-Node backend. 

```
┌────────────────────────────────────────────────────────┐
│                      Client (SPA)                      │
│   (React 19, Tailwind CSS, Lucide Icons, Socket.IO)    │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTPS & WebSockets)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (Express)                    │
│   (NodeJS, Socket.IO, JWT Auth, Helmet, Rate Limiter)  │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
   ┌────────────────┐┌──────────────┐┌──────────────┐
   │    Gemini AI   ││ Neon Postgres││ SMTP Server  │
   │   (3.5-Flash)  ││  (Drizzle)   ││ (Nodemailer) │
   └────────────────┘└──────────────┘└──────────────┘
```

### Key Architectural Pillars:
1. **Frontend Layer**: A highly responsive Single Page Application built on React, utilizing **Tailwind CSS** for visual structure and custom micro-animations (via `motion`). Includes persistent state context for authentication, theme/layout coherence, and a live web socket instance for messaging.
2. **Backend Server**: Express application running on port `3000` with native ESM support. Serves static production builds and acts as the secure reverse-proxy for external API keys (Stripe, Gemini, SMTP).
3. **Real-time WebSockets**: Handles multi-user connections using Socket.IO, enabling instant private chats, real-time unread badges, typing indicators, and live user online/offline status tracking.
4. **AI Compatibility Engine**: Leverages the official Google Gen AI SDK (`@google/genai`) and `gemini-3.5-flash` with JSON-Schema-enforced outputs to evaluate roommate lifestyle matches. Fully optimizes API usage via a proactive DB-caching layer.
5. **Durable Database**: Uses standard relational structures managed through Neon Serverless PostgreSQL to persist users, profiles, listings, messages, notifications, and precomputed AI compatibility scores.

---

## 🗄️ Database Schema

The database relies on a clean relational layout with strict foreign key constraints:

### 1. `users`
Tracks the primary credentials and application roles.
*   `id` (UUID, PK)
*   `name` (VARCHAR, Not Null)
*   `email` (VARCHAR, Unique, Not Null)
*   `passwordHash` (VARCHAR, Not Null)
*   `role` (VARCHAR: `'Tenant' | 'Owner' | 'Admin'`, Not Null)
*   `isSuspended` (BOOLEAN, Default false)
*   `createdAt` (TIMESTAMP, Default now)

### 2. `profiles` (Tenant Profiles)
Houses tenant-specific preferences and biographical info.
*   `id` (UUID, PK)
*   `tenantId` (UUID, FK -> `users.id`, Unique)
*   `preferredLocation` (VARCHAR)
*   `budgetMin` (INTEGER, Default 0)
*   `budgetMax` (INTEGER, Default 2000)
*   `moveInDate` (VARCHAR)
*   `roomTypePreference` (VARCHAR: `'Single' | 'Shared' | 'Studio' | 'Entire Flat' | 'Any'`)
*   `bio` (TEXT)
*   `createdAt` (TIMESTAMP, Default now)

### 3. `listings` (Room Listings)
Houses owner-published available flats/rooms.
*   `id` (UUID, PK)
*   `ownerId` (UUID, FK -> `users.id`)
*   `title` (VARCHAR, Not Null)
*   `description` (TEXT)
*   `location` (VARCHAR, Not Null)
*   `rent` (INTEGER, Not Null)
*   `availableDate` (VARCHAR, Not Null)
*   `roomType` (VARCHAR: `'Single' | 'Shared' | 'Studio' | 'Entire Flat'`, Not Null)
*   `furnishingStatus` (VARCHAR: `'Furnished' | 'Semi-Furnished' | 'Unfurnished'`, Not Null)
*   `roomsCount` (INTEGER, Default 1)
*   `photos` (TEXT[], Default `[]`)
*   `amenities` (TEXT[], Default `[]`)
*   `contact` (VARCHAR)
*   `isFilled` (BOOLEAN, Default false)
*   `createdAt` (TIMESTAMP, Default now)

### 4. `compatibility_scores`
Caches AI compatibility evaluations to prevent redundant LLM invocations.
*   `id` (UUID, PK)
*   `listingId` (UUID, FK -> `listings.id`)
*   `tenantId` (UUID, FK -> `users.id`)
*   `score` (INTEGER, 0-100)
*   `explanation` (TEXT)
*   `createdAt` (TIMESTAMP, Default now)

### 5. `interest_requests`
Stores requests sent by Tenants to Owners.
*   `id` (UUID, PK)
*   `listingId` (UUID, FK -> `listings.id`)
*   `tenantId` (UUID, FK -> `users.id`)
*   `message` (TEXT)
*   `status` (VARCHAR: `'pending' | 'accepted' | 'rejected'`, Default `'pending'`)
*   `createdAt` (TIMESTAMP, Default now)

### 6. `chats`
Represents private conversation channels between owners and tenants (unlocked on request acceptance).
*   `id` (UUID, PK)
*   `listingId` (UUID, FK -> `listings.id`)
*   `tenantId` (UUID, FK -> `users.id`)
*   `ownerId` (UUID, FK -> `users.id`)
*   `createdAt` (TIMESTAMP, Default now)

### 7. `messages`
Stores individual chat messages.
*   `id` (UUID, PK)
*   `chatId` (UUID, FK -> `chats.id`)
*   `senderId` (UUID, FK -> `users.id`)
*   `text` (TEXT, Not Null)
*   `createdAt` (TIMESTAMP, Default now)

### 8. `notifications`
Supports internal platform alerting and unread delivery.
*   `id` (UUID, PK)
*   `userId` (UUID, FK -> `users.id`)
*   `text` (TEXT, Not Null)
*   `isRead` (BOOLEAN, Default false)
*   `createdAt` (TIMESTAMP, Default now)

---

## 🧠 Gemini AI Compatibility Engine

### Prompt Design
The application targets the `gemini-3.5-flash` model using Structured Outputs (`responseSchema` & `responseMimeType: 'application/json'`) to enforce reliable response objects without downstream parsing failures:

```ts
Compute a compatibility score from 0-100.
Evaluate:
1. Location Match (How close is the listing to tenant's preferred location?)
2. Budget Match (Does the rent fit the tenant's budget range?)
3. Move-in Date Compatibility (Is the listing available near tenant's move-in date?)
4. Room Type (Is it Single, Shared, Studio, Entire Flat, matching preference?)
5. Lifestyle Fit (Based on the description and bio, is there compatibility?)

Return your evaluation. You must respond strictly in JSON with the following structure:
{
  "score": number,
  "explanation": string
}
```

### Optimizations & Fallbacks
*   **Database Caching Layer**: Compatibility scores are calculated *lazily* on first render and persisted in the `compatibility_scores` table. Subsequent listings browsing or detailed view queries load the score directly from the database instead of re-invoking the Gemini API.
*   **Rule-based Fallback**: If the `GEMINI_API_KEY` is missing or the external API call fails, the engine seamlessly triggers a robust, deterministic fallback calculation checking:
    *   *Budget fitting* (40% weight, penalizing over-budget entries proportionally)
    *   *Location intersection* (30% weight, verifying substring match and token boundaries)
    *   *Move-in date variance* (15% weight, calculated using day differences)
    *   *Room type alignment* (15% weight)

---

## 💬 Real-time Chat & WebSockets (Socket.IO)

Chat rooms are automatically opened when an owner accepts a tenant's interest request.

### Core Events Flow:
1.  **`register-user`**: Dispatched by the client immediately upon websocket connection. Registers the socket ID against their authenticated User ID.
2.  **`online-users`**: Broadcast by the server on socket connection, registration, and disconnection events. Informs active chats of who is currently online.
3.  **`join-room`**: Subscribes a user's socket to a specific room matching a `chatId`.
4.  **`send-message`**: Client transmits `{ chatId, senderId, text }`. The server persists the message in the relational database, then immediately broadcasts `receive-message` to the room.
5.  **`typing`**: Emits state `{ chatId, userId, isTyping }` with a 2-second debounce, triggering the "Typing message..." bubble for the recipient.
6.  **`disconnect`**: Cleans up memory maps and fires updated `online-users` updates to keep user statuses up-to-date.

---

## 🔑 Security Protocols

1.  **Helmet Integration**: Standard security headers configured via `helmet()` with relaxed CSP/frame-ancestors options to support sandbox preview modes inside iframes.
2.  **Rate Limiting**: Configured using `express-rate-limit`. Prevents denial-of-service and brute-force attacks by limiting IP addresses to `200` requests per 15 minutes on all `/api/*` endpoints.
3.  **Password Hashing**: Integrates `bcryptjs` with `10` salt rounds for secure hashing during user registration.
4.  **Token-based Auth**: Signs access tokens with `jsonwebtoken` (JWT) containing userId, email, and user role, expiring in 7 days.
5.  **Role Authorization**: Protects REST endpoints using declarative middlewares:
    *   `authenticateToken`: Validates JWT and verifies that the account is neither deleted nor suspended.
    *   `requireRole('Tenant' | 'Owner' | 'Admin')`: Restricts API actions specifically based on roles.
    *   `requireAdminOrSelf`: Blocks non-admins from modifying or accessing profile routes belonging to other users.

---

## 🌐 API Documentation

### Auth Endpoints
*   `POST /api/register`: Creates a user (and defaults a tenant profile if role is `'Tenant'`).
*   `POST /api/login`: Authenticates credentials and returns a JWT token.
*   `GET /api/me`: Fetches profile information for the currently authenticated user.

### Listing Endpoints
*   `GET /api/listing`: Returns listings. Accepts filters `location`, `maxBudget`, `roomType`, `furnished`, `availableDate`, and `sortBy` (`Lowest Rent` | `Newest` | `Highest Compatibility`).
*   `POST /api/listing`: (Owner only) Creates a new room listing.
*   `PUT /api/listing/:id`: (Owner only) Edits listing details.
*   `DELETE /api/listing/:id`: Removes a listing.

### Interest & Compatibility Endpoints
*   `GET /api/compatibility/:listingId`: Fetches or computes compatibility score.
*   `POST /api/interest`: (Tenant only) Expresses interest in a listing and triggers notifications.
*   `PUT /api/interest/:id`: (Owner only) Approves (`accepted`) or declines (`rejected`) a request.
*   `GET /api/owner/requests`: (Owner only) Fetches active requests on owner's listings.
*   `GET /api/tenant/requests`: (Tenant only) Fetches requests sent by the tenant.

### Chat & Messaging Endpoints
*   `GET /api/chat`: Returns conversation threads for the user.
*   `GET /api/chat/:id/messages`: Retrieves historical private messages in a thread.
*   `POST /api/chat/:id/message`: Fallback REST endpoint for sending messages when WS is unavailable.

### Admin Panel Endpoints
*   `GET /api/admin/stats`: (Admin only) Returns total users, listings, requests, and active chats.
*   `GET /api/admin/users`: (Admin only) Returns lists of users on the platform.
*   `PUT /api/admin/users/:id/suspend`: (Admin only) Suspends or unsuspends users.
*   `DELETE /api/admin/users/:id`: (Admin only) Deletes a user account.

---

## ⚙️ Setup & Deployment

### Environment Configuration
Configure these keys inside your private `.env` (or setup via AI Studio Secrets):
```env
GEMINI_API_KEY="your-google-gemini-key"
DATABASE_URL="postgresql://user:password@neon-host/dbname?sslmode=require"
JWT_SECRET="any-custom-signing-secret"
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
SMTP_FROM="no-reply@rentflatmate.com"
```

### Running the App Locally:
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server**:
    ```bash
    npm run dev
    ```
3.  **Compile & bundle for production**:
    ```bash
    npm run build
    npm run start
    ```
