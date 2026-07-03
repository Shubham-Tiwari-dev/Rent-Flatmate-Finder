import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project's .env file using absolute path
const mainEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: mainEnvPath });

// Also check and load from process.cwd() .env file if it's different
const cwdEnvPath = path.resolve(process.cwd(), '.env');
if (cwdEnvPath !== mainEnvPath) {
  dotenv.config({ path: cwdEnvPath });
}

// Check if another .env file is overriding the value (e.g. .env.local, .env.development)
const otherEnvFiles = ['.env.local', '.env.development', '.env.production'];
for (const file of otherEnvFiles) {
  const otherPath = path.resolve(process.cwd(), file);
  dotenv.config({ path: otherPath });
}

const { Pool } = pg;

let dbUrl = process.env.DATABASE_URL;

// Clean surrounding quotes from connection string if present
if (dbUrl) {
  dbUrl = dbUrl.trim();
  if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
    dbUrl = dbUrl.slice(1, -1).trim();
  } else if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
    dbUrl = dbUrl.slice(1, -1).trim();
  }
}

const usePostgres = !!dbUrl && dbUrl !== 'undefined' && dbUrl !== 'null' && dbUrl.trim() !== '';

// Helper to mask password in DATABASE_URL
function maskDbUrl(url: string | undefined): string {
  if (!url) return 'undefined';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '********';
    }
    return parsed.toString();
  } catch (err) {
    return url.replace(/([^:]+:\/\/[^:]+:)[^@]+(@.+)/, '$1********$2');
  }
}

console.log(`Database Adapter: usePostgres = ${usePostgres}`);
console.log(`Detected DATABASE_URL: ${maskDbUrl(dbUrl)}`);

// Setup Neon PostgreSQL connection pool conditionally (to prevent start crashes when not configured)
export let pool: pg.Pool | null = null;
if (usePostgres) {
  console.log('Initializing Neon PostgreSQL Pool...');
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false, // Required by Neon for SSL connections
    },
  });
} else {
  console.log('DATABASE_URL is not configured. Falling back to JSON-persisted db.json storage.');
}

// Interface Declarations
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'Tenant' | 'Owner' | 'Admin';
  isSuspended: boolean;
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
  photos: string[]; // JSON stringified array of Base64 or URLs
  amenities: string[];
  contact: string;
  isFilled: boolean;
  createdAt: string;
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
}

export interface Chat {
  id: string;
  listingId: string;
  tenantId: string;
  ownerId: string;
  createdAt: string;
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

interface JsonDbSchema {
  users: User[];
  listings: Listing[];
  profiles: Profile[];
  compatibilityScores: CompatibilityScore[];
  interestRequests: InterestRequest[];
  chats: Chat[];
  messages: Message[];
  notifications: Notification[];
}

// JSON file database memory storage and functions
let memoryDb: JsonDbSchema = {
  users: [],
  listings: [],
  profiles: [],
  compatibilityScores: [],
  interestRequests: [],
  chats: [],
  messages: [],
  notifications: [],
};

const DB_FILE = path.join(process.cwd(), 'db.json');

async function readJsonDb(): Promise<JsonDbSchema> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      users: parsed.users || [],
      listings: parsed.listings || [],
      profiles: parsed.profiles || [],
      compatibilityScores: parsed.compatibilityScores || [],
      interestRequests: parsed.interestRequests || [],
      chats: parsed.chats || [],
      messages: parsed.messages || [],
      notifications: parsed.notifications || [],
    };
  } catch (err) {
    return {
      users: [
        {
          id: 'admin-1',
          name: 'Administrator',
          email: 'admin@gmail.com',
          passwordHash: '$2b$10$xaj9/ZfMSk1Y8YzUr.g3ROGWPpmLPyWx9pUs6SIeAPCCntyqT0mNe', // admin
          role: 'Admin',
          isSuspended: false,
          createdAt: new Date().toISOString(),
        },
      ],
      listings: [],
      profiles: [],
      compatibilityScores: [],
      interestRequests: [],
      chats: [],
      messages: [],
      notifications: [],
    };
  }
}

async function writeJsonDb(data: JsonDbSchema): Promise<void> {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing JSON database to disk:', err);
  }
}

function matchesFilter(item: any, filter?: any): boolean {
  if (!filter) return true;
  for (const key of Object.keys(filter)) {
    if (item[key] !== filter[key]) return false;
  }
  return true;
}

// Database Row Mapping Helpers for Postgres
export function mapUser(row: any): User | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    isSuspended: !!row.isSuspended,
    createdAt: row.createdAt,
  };
}

export function mapListing(row: any): Listing | null {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    location: row.location,
    rent: Number(row.rent),
    availableDate: row.availableDate,
    roomType: row.roomType,
    furnishingStatus: row.furnishingStatus,
    roomsCount: Number(row.roomsCount),
    photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : (row.photos || []),
    amenities: typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || []),
    contact: row.contact,
    isFilled: !!row.isFilled,
    createdAt: row.createdAt,
  };
}

export function mapProfile(row: any): Profile | null {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    preferredLocation: row.preferredLocation,
    budgetMin: Number(row.budgetMin),
    budgetMax: Number(row.budgetMax),
    moveInDate: row.moveInDate,
    roomTypePreference: row.roomTypePreference,
    bio: row.bio,
    createdAt: row.createdAt,
  };
}

export function mapCompatibilityScore(row: any): CompatibilityScore | null {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listingId,
    tenantId: row.tenantId,
    score: Number(row.score),
    explanation: row.explanation,
    createdAt: row.createdAt,
  };
}

export function mapInterestRequest(row: any): InterestRequest | null {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listingId,
    tenantId: row.tenantId,
    status: row.status,
    message: row.message,
    createdAt: row.createdAt,
  };
}

export function mapChat(row: any): Chat | null {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listingId,
    tenantId: row.tenantId,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
  };
}

export function mapMessage(row: any): Message | null {
  if (!row) return null;
  return {
    id: row.id,
    chatId: row.chatId,
    senderId: row.senderId,
    text: row.text,
    isRead: !!row.isRead,
    createdAt: row.createdAt,
  };
}

export function mapNotification(row: any): Notification | null {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    text: row.text,
    isRead: !!row.isRead,
    createdAt: row.createdAt,
  };
}

// Neon PostgreSQL & JSON Hybrid Database Class
class HybridDatabase {
  private usePostgres = usePostgres;

  public async init() {
    if (this.usePostgres) {
      try {
        console.log('Synchronizing database tables with Neon PostgreSQL...');
        if (!pool) throw new Error('PostgreSQL Connection Pool is uninitialized.');

        // 1. Create Tables
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            "passwordHash" TEXT,
            role TEXT,
            "isSuspended" BOOLEAN DEFAULT FALSE,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS owner_profiles (
            id TEXT PRIMARY KEY,
            "ownerId" TEXT UNIQUE,
            bio TEXT,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS tenant_profiles (
            id TEXT PRIMARY KEY,
            "tenantId" TEXT UNIQUE,
            "preferredLocation" TEXT,
            "budgetMin" INTEGER DEFAULT 0,
            "budgetMax" INTEGER DEFAULT 2000,
            "moveInDate" TEXT,
            "roomTypePreference" TEXT,
            bio TEXT,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS listings (
            id TEXT PRIMARY KEY,
            "ownerId" TEXT,
            title TEXT,
            description TEXT,
            location TEXT,
            rent INTEGER,
            "availableDate" TEXT,
            "roomType" TEXT,
            "furnishingStatus" TEXT,
            "roomsCount" INTEGER,
            photos TEXT,
            amenities TEXT,
            contact TEXT,
            "isFilled" BOOLEAN DEFAULT FALSE,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS compatibility_scores (
            id TEXT PRIMARY KEY,
            "listingId" TEXT,
            "tenantId" TEXT,
            score INTEGER,
            explanation TEXT,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS interest_requests (
            id TEXT PRIMARY KEY,
            "listingId" TEXT,
            "tenantId" TEXT,
            status TEXT DEFAULT 'pending',
            message TEXT,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            "listingId" TEXT,
            "tenantId" TEXT,
            "ownerId" TEXT,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            "chatId" TEXT,
            "senderId" TEXT,
            text TEXT,
            "isRead" BOOLEAN DEFAULT FALSE,
            "createdAt" TEXT
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            "userId" TEXT,
            text TEXT,
            "isRead" BOOLEAN DEFAULT FALSE,
            "createdAt" TEXT
          );
        `);

        // 2. Create Performance Indexes (Requirement 12)
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tenant_profiles_tenantId ON tenant_profiles("tenantId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_owner_profiles_ownerId ON owner_profiles("ownerId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_listings_ownerId ON listings("ownerId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_compatibility_scores_listing_tenant ON compatibility_scores("listingId", "tenantId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_interest_requests_listingId ON interest_requests("listingId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_interest_requests_tenantId ON interest_requests("tenantId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_chats_tenantId ON chats("tenantId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_chats_ownerId ON chats("ownerId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages("chatId");');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");');

        // 3. Seed Default Administrator Account
        await this.seedAdmin();

        console.log('Database schema and index synchronization with Neon PostgreSQL complete.');
      } catch (err) {
        console.error('CRITICAL: Failed to initialize PostgreSQL tables in Neon:', err);
        throw err;
      }
    } else {
      console.log('Loading JSON-persisted database from db.json...');
      memoryDb = await readJsonDb();
      
      const adminEmail = 'admin@gmail.com';
      const adminPasswordHash = await bcrypt.hash('admin', 10);
      
      let adminUser = memoryDb.users.find((u) => u.email === adminEmail);
      if (adminUser) {
        adminUser.role = 'Admin';
        adminUser.passwordHash = adminPasswordHash;
        console.log(`Updated existing local user with email ${adminEmail} to have Admin role and 'admin' password.`);
        await writeJsonDb(memoryDb);
      } else {
        let oldAdmin = memoryDb.users.find((u) => u.email === 'admin@rentflatmate.com');
        if (oldAdmin) {
          oldAdmin.email = adminEmail;
          oldAdmin.passwordHash = adminPasswordHash;
          oldAdmin.role = 'Admin';
          console.log(`Updated old local admin user 'admin@rentflatmate.com' to ${adminEmail} with 'admin' password.`);
          await writeJsonDb(memoryDb);
        } else {
          let otherAdmin = memoryDb.users.find((u) => u.role === 'Admin');
          if (otherAdmin) {
            otherAdmin.email = adminEmail;
            otherAdmin.passwordHash = adminPasswordHash;
            console.log(`Updated existing local Admin role user to ${adminEmail} with 'admin' password.`);
            await writeJsonDb(memoryDb);
          } else {
            memoryDb.users.push({
              id: 'admin-1',
              name: 'Administrator',
              email: adminEmail,
              passwordHash: adminPasswordHash,
              role: 'Admin',
              isSuspended: false,
              createdAt: new Date().toISOString(),
            });
            console.log('Seeded brand new Administrator account in local memory DB.');
            await writeJsonDb(memoryDb);
          }
        }
      }
      console.log(`JSON database loaded successfully. Total registered users: ${memoryDb.users.length}`);
    }
  }

  private async seedAdmin() {
    try {
      if (!pool) return;
      
      const adminEmail = 'admin@gmail.com';
      const adminPasswordHash = await bcrypt.hash('admin', 10);
      
      // 1. Check if user with email 'admin@gmail.com' exists
      const exactEmailRes = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
      if (exactEmailRes.rows.length > 0) {
        const existingId = exactEmailRes.rows[0].id;
        await pool.query(
          'UPDATE users SET role = $1, "passwordHash" = $2 WHERE id = $3',
          ['Admin', adminPasswordHash, existingId]
        );
        console.log(`Updated existing user with email ${adminEmail} to have Admin role and 'admin' password.`);
        return;
      }

      // 2. Check if the old default admin 'admin@rentflatmate.com' exists
      const oldEmailRes = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@rentflatmate.com']);
      if (oldEmailRes.rows.length > 0) {
        const existingId = oldEmailRes.rows[0].id;
        await pool.query(
          'UPDATE users SET email = $1, "passwordHash" = $2, role = $3 WHERE id = $4',
          [adminEmail, adminPasswordHash, 'Admin', existingId]
        );
        console.log(`Updated old admin user 'admin@rentflatmate.com' to ${adminEmail} with 'admin' password.`);
        return;
      }

      // 3. Check if any other admin exists
      const roleAdminRes = await pool.query("SELECT * FROM users WHERE role = 'Admin'");
      if (roleAdminRes.rows.length > 0) {
        const existingId = roleAdminRes.rows[0].id;
        await pool.query(
          'UPDATE users SET email = $1, "passwordHash" = $2 WHERE id = $3',
          [adminEmail, adminPasswordHash, existingId]
        );
        console.log(`Updated existing Admin role user (id: ${existingId}) to ${adminEmail} with 'admin' password.`);
        return;
      }

      // 4. Create new Administrator if no admin exists anywhere
      const adminUser = {
        id: 'admin-1',
        name: 'Administrator',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'Admin',
        isSuspended: false,
        createdAt: new Date().toISOString(),
      };

      await pool.query(
        'INSERT INTO users (id, name, email, "passwordHash", role, "isSuspended", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [adminUser.id, adminUser.name, adminUser.email, adminUser.passwordHash, adminUser.role, adminUser.isSuspended, adminUser.createdAt]
      );
      console.log('Seeded brand new Administrator account in Neon PostgreSQL.');
    } catch (err) {
      console.error('Error seeding admin user into database:', err);
    }
  }

  // Model Operations
  get users() {
    return {
      find: async (filter?: Partial<User>): Promise<User[]> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          let queryText = 'SELECT * FROM users';
          const values: any[] = [];
          if (filter) {
            const keys = Object.keys(filter);
            if (keys.length > 0) {
              queryText += ' WHERE ' + keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ');
              values.push(...Object.values(filter));
            }
          }
          queryText += ' ORDER BY "createdAt" DESC';
          const res = await pool.query(queryText, values);
          return res.rows.map(mapUser).filter((u): u is User => u !== null);
        } else {
          return memoryDb.users
            .filter((u) => matchesFilter(u, filter))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      },
      findOne: async (filter: Partial<User>): Promise<User | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(filter);
          if (keys.length === 0) return null;
          const queryText = `SELECT * FROM users WHERE ${keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ')} LIMIT 1`;
          const res = await pool.query(queryText, Object.values(filter));
          return mapUser(res.rows[0]);
        } else {
          return memoryDb.users.find((u) => matchesFilter(u, filter)) || null;
        }
      },
      findById: async (id: string): Promise<User | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
          return mapUser(res.rows[0]);
        } else {
          return memoryDb.users.find((u) => u.id === id) || null;
        }
      },
      create: async (item: Omit<User, 'id' | 'createdAt'> & { id?: string }): Promise<User> => {
        const newUser: User = {
          ...item,
          id: item.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date().toISOString(),
        };
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query(
            'INSERT INTO users (id, name, email, "passwordHash", role, "isSuspended", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.role, newUser.isSuspended, newUser.createdAt]
          );
        } else {
          memoryDb.users.push(newUser);
          await writeJsonDb(memoryDb);
        }
        return newUser;
      },
      findByIdAndUpdate: async (id: string, updates: Partial<User>): Promise<User | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(updates);
          if (keys.length === 0) return null;
          const setClause = keys.map((key, idx) => `"${key}" = $${idx + 2}`).join(', ');
          const queryText = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
          const res = await pool.query(queryText, [id, ...Object.values(updates)]);
          return mapUser(res.rows[0]);
        } else {
          const index = memoryDb.users.findIndex((u) => u.id === id);
          if (index === -1) return null;
          memoryDb.users[index] = { ...memoryDb.users[index], ...updates };
          await writeJsonDb(memoryDb);
          return memoryDb.users[index];
        }
      },
      deleteOne: async (id: string): Promise<boolean> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query('DELETE FROM users WHERE id = $1', [id]);
          return (res.rowCount ?? 0) > 0;
        } else {
          const originalLength = memoryDb.users.length;
          memoryDb.users = memoryDb.users.filter((u) => u.id !== id);
          if (memoryDb.users.length !== originalLength) {
            await writeJsonDb(memoryDb);
            return true;
          }
          return false;
        }
      },
    };
  }

  get profiles() {
    return {
      findOne: async (filter: Partial<Profile>): Promise<Profile | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(filter);
          if (keys.length === 0) return null;
          const queryText = `SELECT * FROM tenant_profiles WHERE ${keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ')} LIMIT 1`;
          const res = await pool.query(queryText, Object.values(filter));
          return mapProfile(res.rows[0]);
        } else {
          return memoryDb.profiles.find((p) => matchesFilter(p, filter)) || null;
        }
      },
      create: async (item: Omit<Profile, 'id' | 'createdAt'>): Promise<Profile> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query('DELETE FROM tenant_profiles WHERE "tenantId" = $1', [item.tenantId]);
          const newProfile: Profile = {
            ...item,
            id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
          };
          await pool.query(
            'INSERT INTO tenant_profiles (id, "tenantId", "preferredLocation", "budgetMin", "budgetMax", "moveInDate", "roomTypePreference", bio, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
              newProfile.id,
              newProfile.tenantId,
              newProfile.preferredLocation,
              newProfile.budgetMin,
              newProfile.budgetMax,
              newProfile.moveInDate,
              newProfile.roomTypePreference,
              newProfile.bio,
              newProfile.createdAt,
            ]
          );
          return newProfile;
        } else {
          memoryDb.profiles = memoryDb.profiles.filter((p) => p.tenantId !== item.tenantId);
          const newProfile: Profile = {
            ...item,
            id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
          };
          memoryDb.profiles.push(newProfile);
          await writeJsonDb(memoryDb);
          return newProfile;
        }
      },
      findByIdAndUpdate: async (id: string, updates: Partial<Profile>): Promise<Profile | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(updates);
          if (keys.length === 0) return null;
          const setClause = keys.map((key, idx) => `"${key}" = $${idx + 2}`).join(', ');
          const queryText = `UPDATE tenant_profiles SET ${setClause} WHERE id = $1 RETURNING *`;
          const res = await pool.query(queryText, [id, ...Object.values(updates)]);
          return mapProfile(res.rows[0]);
        } else {
          const index = memoryDb.profiles.findIndex((p) => p.id === id);
          if (index === -1) return null;
          memoryDb.profiles[index] = { ...memoryDb.profiles[index], ...updates };
          await writeJsonDb(memoryDb);
          return memoryDb.profiles[index];
        }
      },
      deleteOne: async (id: string): Promise<boolean> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query('DELETE FROM tenant_profiles WHERE id = $1', [id]);
          return (res.rowCount ?? 0) > 0;
        } else {
          const originalLength = memoryDb.profiles.length;
          memoryDb.profiles = memoryDb.profiles.filter((p) => p.id !== id);
          if (memoryDb.profiles.length !== originalLength) {
            await writeJsonDb(memoryDb);
            return true;
          }
          return false;
        }
      },
    };
  }

  get listings() {
    return {
      find: async (filter?: Partial<Listing>): Promise<Listing[]> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          let queryText = 'SELECT * FROM listings';
          const values: any[] = [];
          if (filter) {
            const keys = Object.keys(filter);
            if (keys.length > 0) {
              queryText += ' WHERE ' + keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ');
              values.push(...Object.values(filter));
            }
          }
          queryText += ' ORDER BY "createdAt" DESC';
          const res = await pool.query(queryText, values);
          return res.rows.map(mapListing).filter((l): l is Listing => l !== null);
        } else {
          return memoryDb.listings
            .filter((l) => matchesFilter(l, filter))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      },
      findById: async (id: string): Promise<Listing | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query('SELECT * FROM listings WHERE id = $1', [id]);
          return mapListing(res.rows[0]);
        } else {
          return memoryDb.listings.find((l) => l.id === id) || null;
        }
      },
      create: async (item: Omit<Listing, 'id' | 'createdAt' | 'isFilled'>): Promise<Listing> => {
        const newListing: Listing = {
          ...item,
          id: `listing-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          isFilled: false,
          createdAt: new Date().toISOString(),
        };
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query(
            'INSERT INTO listings (id, "ownerId", title, description, location, rent, "availableDate", "roomType", "furnishingStatus", "roomsCount", photos, amenities, contact, "isFilled", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
            [
              newListing.id,
              newListing.ownerId,
              newListing.title,
              newListing.description,
              newListing.location,
              newListing.rent,
              newListing.availableDate,
              newListing.roomType,
              newListing.furnishingStatus,
              newListing.roomsCount,
              JSON.stringify(newListing.photos),
              JSON.stringify(newListing.amenities),
              newListing.contact,
              newListing.isFilled,
              newListing.createdAt,
            ]
          );
        } else {
          memoryDb.listings.push(newListing);
          await writeJsonDb(memoryDb);
        }
        return newListing;
      },
      findByIdAndUpdate: async (id: string, updates: Partial<Listing>): Promise<Listing | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(updates);
          if (keys.length === 0) return null;
          
          const mappedUpdates = { ...updates };
          if (updates.photos) {
            (mappedUpdates as any).photos = JSON.stringify(updates.photos);
          }
          if (updates.amenities) {
            (mappedUpdates as any).amenities = JSON.stringify(updates.amenities);
          }

          const setClause = keys.map((key, idx) => `"${key}" = $${idx + 2}`).join(', ');
          const queryText = `UPDATE listings SET ${setClause} WHERE id = $1 RETURNING *`;
          const res = await pool.query(queryText, [id, ...Object.values(mappedUpdates)]);
          return mapListing(res.rows[0]);
        } else {
          const index = memoryDb.listings.findIndex((l) => l.id === id);
          if (index === -1) return null;
          memoryDb.listings[index] = { ...memoryDb.listings[index], ...updates };
          await writeJsonDb(memoryDb);
          return memoryDb.listings[index];
        }
      },
      deleteOne: async (id: string): Promise<boolean> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query('DELETE FROM listings WHERE id = $1', [id]);
          return (res.rowCount ?? 0) > 0;
        } else {
          const originalLength = memoryDb.listings.length;
          memoryDb.listings = memoryDb.listings.filter((l) => l.id !== id);
          if (memoryDb.listings.length !== originalLength) {
            await writeJsonDb(memoryDb);
            return true;
          }
          return false;
        }
      },
    };
  }

  get compatibilityScores() {
    return {
      findOne: async (filter: Partial<CompatibilityScore>): Promise<CompatibilityScore | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(filter);
          if (keys.length === 0) return null;
          const queryText = `SELECT * FROM compatibility_scores WHERE ${keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ')} LIMIT 1`;
          const res = await pool.query(queryText, Object.values(filter));
          return mapCompatibilityScore(res.rows[0]);
        } else {
          return memoryDb.compatibilityScores.find((s) => matchesFilter(s, filter)) || null;
        }
      },
      create: async (item: Omit<CompatibilityScore, 'id' | 'createdAt'>): Promise<CompatibilityScore> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query('DELETE FROM compatibility_scores WHERE "listingId" = $1 AND "tenantId" = $2', [item.listingId, item.tenantId]);
          const newScore: CompatibilityScore = {
            ...item,
            id: `score-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
          };
          await pool.query(
            'INSERT INTO compatibility_scores (id, "listingId", "tenantId", score, explanation, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
            [newScore.id, newScore.listingId, newScore.tenantId, newScore.score, newScore.explanation, newScore.createdAt]
          );
          return newScore;
        } else {
          memoryDb.compatibilityScores = memoryDb.compatibilityScores.filter((s) => !(s.listingId === item.listingId && s.tenantId === item.tenantId));
          const newScore: CompatibilityScore = {
            ...item,
            id: `score-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
          };
          memoryDb.compatibilityScores.push(newScore);
          await writeJsonDb(memoryDb);
          return newScore;
        }
      },
    };
  }

  get interestRequests() {
    return {
      find: async (filter?: Partial<InterestRequest>): Promise<InterestRequest[]> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          let queryText = 'SELECT * FROM interest_requests';
          const values: any[] = [];
          if (filter) {
            const keys = Object.keys(filter);
            if (keys.length > 0) {
              queryText += ' WHERE ' + keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ');
              values.push(...Object.values(filter));
            }
          }
          queryText += ' ORDER BY "createdAt" DESC';
          const res = await pool.query(queryText, values);
          return res.rows.map(mapInterestRequest).filter((r): r is InterestRequest => r !== null);
        } else {
          return memoryDb.interestRequests
            .filter((r) => matchesFilter(r, filter))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      },
      findById: async (id: string): Promise<InterestRequest | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query('SELECT * FROM interest_requests WHERE id = $1', [id]);
          return mapInterestRequest(res.rows[0]);
        } else {
          return memoryDb.interestRequests.find((r) => r.id === id) || null;
        }
      },
      create: async (item: Omit<InterestRequest, 'id' | 'createdAt' | 'status'>): Promise<InterestRequest> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query('DELETE FROM interest_requests WHERE "listingId" = $1 AND "tenantId" = $2', [item.listingId, item.tenantId]);
          const newReq: InterestRequest = {
            ...item,
            id: `interest-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          await pool.query(
            'INSERT INTO interest_requests (id, "listingId", "tenantId", status, message, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
            [newReq.id, newReq.listingId, newReq.tenantId, newReq.status, newReq.message, newReq.createdAt]
          );
          return newReq;
        } else {
          memoryDb.interestRequests = memoryDb.interestRequests.filter((r) => !(r.listingId === item.listingId && r.tenantId === item.tenantId));
          const newReq: InterestRequest = {
            ...item,
            id: `interest-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          memoryDb.interestRequests.push(newReq);
          await writeJsonDb(memoryDb);
          return newReq;
        }
      },
      findByIdAndUpdate: async (id: string, updates: Partial<InterestRequest>): Promise<InterestRequest | null> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const keys = Object.keys(updates);
          if (keys.length === 0) return null;
          const setClause = keys.map((key, idx) => `"${key}" = $${idx + 2}`).join(', ');
          const queryText = `UPDATE interest_requests SET ${setClause} WHERE id = $1 RETURNING *`;
          const res = await pool.query(queryText, [id, ...Object.values(updates)]);
          return mapInterestRequest(res.rows[0]);
        } else {
          const index = memoryDb.interestRequests.findIndex((r) => r.id === id);
          if (index === -1) return null;
          memoryDb.interestRequests[index] = { ...memoryDb.interestRequests[index], ...updates };
          await writeJsonDb(memoryDb);
          return memoryDb.interestRequests[index];
        }
      },
    };
  }

  get chats() {
    return {
      find: async (filter?: Partial<Chat>): Promise<Chat[]> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          let queryText = 'SELECT * FROM chats';
          const values: any[] = [];
          if (filter) {
            const keys = Object.keys(filter);
            if (keys.length > 0) {
              queryText += ' WHERE ' + keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ');
              values.push(...Object.values(filter));
            }
          }
          queryText += ' ORDER BY "createdAt" DESC';
          const res = await pool.query(queryText, values);
          return res.rows.map(mapChat).filter((c): c is Chat => c !== null);
        } else {
          return memoryDb.chats
            .filter((c) => matchesFilter(c, filter))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      },
      create: async (item: Omit<Chat, 'id' | 'createdAt'>): Promise<Chat> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const existingRes = await pool.query(
            'SELECT * FROM chats WHERE "listingId" = $1 AND "tenantId" = $2 LIMIT 1',
            [item.listingId, item.tenantId]
          );
          if (existingRes.rows.length > 0) {
            return mapChat(existingRes.rows[0])!;
          }

          const newChat: Chat = {
            ...item,
            id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
          };
          await pool.query(
            'INSERT INTO chats (id, "listingId", "tenantId", "ownerId", "createdAt") VALUES ($1, $2, $3, $4, $5)',
            [newChat.id, newChat.listingId, newChat.tenantId, newChat.ownerId, newChat.createdAt]
          );
          return newChat;
        } else {
          const existingChat = memoryDb.chats.find((c) => c.listingId === item.listingId && c.tenantId === item.tenantId);
          if (existingChat) return existingChat;

          const newChat: Chat = {
            ...item,
            id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
          };
          memoryDb.chats.push(newChat);
          await writeJsonDb(memoryDb);
          return newChat;
        }
      },
    };
  }

  get messages() {
    return {
      find: async (filter?: Partial<Message>): Promise<Message[]> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          let queryText = 'SELECT * FROM messages';
          const values: any[] = [];
          if (filter) {
            const keys = Object.keys(filter);
            if (keys.length > 0) {
              queryText += ' WHERE ' + keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ');
              values.push(...Object.values(filter));
            }
          }
          queryText += ' ORDER BY "createdAt" ASC';
          const res = await pool.query(queryText, values);
          return res.rows.map(mapMessage).filter((m): m is Message => m !== null);
        } else {
          return memoryDb.messages
            .filter((m) => matchesFilter(m, filter))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
      },
      create: async (item: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Promise<Message> => {
        const newMsg: Message = {
          ...item,
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query(
            'INSERT INTO messages (id, "chatId", "senderId", text, "isRead", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
            [newMsg.id, newMsg.chatId, newMsg.senderId, newMsg.text, newMsg.isRead, newMsg.createdAt]
          );
        } else {
          memoryDb.messages.push(newMsg);
          await writeJsonDb(memoryDb);
        }
        return newMsg;
      },
      markAsRead: async (chatId: string, receiverId: string): Promise<number> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          const res = await pool.query(
            'UPDATE messages SET "isRead" = TRUE WHERE "chatId" = $1 AND "senderId" != $2 AND "isRead" = FALSE',
            [chatId, receiverId]
          );
          return res.rowCount ?? 0;
        } else {
          let count = 0;
          memoryDb.messages.forEach((m) => {
            if (m.chatId === chatId && m.senderId !== receiverId && !m.isRead) {
              m.isRead = true;
              count++;
            }
          });
          if (count > 0) {
            await writeJsonDb(memoryDb);
          }
          return count;
        }
      },
    };
  }

  get notifications() {
    return {
      find: async (filter?: Partial<Notification>): Promise<Notification[]> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          let queryText = 'SELECT * FROM notifications';
          const values: any[] = [];
          if (filter) {
            const keys = Object.keys(filter);
            if (keys.length > 0) {
              queryText += ' WHERE ' + keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(' AND ');
              values.push(...Object.values(filter));
            }
          }
          queryText += ' ORDER BY "createdAt" DESC';
          const res = await pool.query(queryText, values);
          return res.rows.map(mapNotification).filter((n): n is Notification => n !== null);
        } else {
          return memoryDb.notifications
            .filter((n) => matchesFilter(n, filter))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      },
      create: async (item: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> => {
        const newNotif: Notification = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query(
            'INSERT INTO notifications (id, "userId", text, "isRead", "createdAt") VALUES ($1, $2, $3, $4, $5)',
            [newNotif.id, newNotif.userId, newNotif.text, newNotif.isRead, newNotif.createdAt]
          );
        } else {
          memoryDb.notifications.push(newNotif);
          await writeJsonDb(memoryDb);
        }
        return newNotif;
      },
      markAllAsRead: async (userId: string): Promise<void> => {
        if (this.usePostgres) {
          if (!pool) throw new Error('Postgres pool not initialized');
          await pool.query(
            'UPDATE notifications SET "isRead" = TRUE WHERE "userId" = $1 AND "isRead" = FALSE',
            [userId]
          );
        } else {
          let updated = false;
          memoryDb.notifications.forEach((n) => {
            if (n.userId === userId && !n.isRead) {
              n.isRead = true;
              updated = true;
            }
          });
          if (updated) {
            await writeJsonDb(memoryDb);
          }
        }
      },
    };
  }

  public async getStats() {
    if (this.usePostgres) {
      try {
        if (!pool) throw new Error('Postgres pool not initialized');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const listingsCount = await pool.query('SELECT COUNT(*) FROM listings');
        const activeListings = await pool.query('SELECT COUNT(*) FROM listings WHERE "isFilled" = false');
        const filledListings = await pool.query('SELECT COUNT(*) FROM listings WHERE "isFilled" = true');
        const requestsCount = await pool.query('SELECT COUNT(*) FROM interest_requests');
        const chatsCount = await pool.query('SELECT COUNT(*) FROM chats');

        return {
          totalUsers: parseInt(usersCount.rows[0].count || '0', 10),
          totalListings: parseInt(listingsCount.rows[0].count || '0', 10),
          activeListings: parseInt(activeListings.rows[0].count || '0', 10),
          filledListings: parseInt(filledListings.rows[0].count || '0', 10),
          totalRequests: parseInt(requestsCount.rows[0].count || '0', 10),
          totalChats: parseInt(chatsCount.rows[0].count || '0', 10),
        };
      } catch (err) {
        console.error('Error fetching admin statistics from Neon:', err);
        return {
          totalUsers: 0,
          totalListings: 0,
          activeListings: 0,
          filledListings: 0,
          totalRequests: 0,
          totalChats: 0,
        };
      }
    } else {
      return {
        totalUsers: memoryDb.users.length,
        totalListings: memoryDb.listings.length,
        activeListings: memoryDb.listings.filter((l) => !l.isFilled).length,
        filledListings: memoryDb.listings.filter((l) => l.isFilled).length,
        totalRequests: memoryDb.interestRequests.length,
        totalChats: memoryDb.chats.length,
      };
    }
  }
}

export const db = new HybridDatabase();
