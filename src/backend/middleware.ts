import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-rentmate-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'Tenant' | 'Owner' | 'Admin';
  };
}

/**
 * Require valid JWT authentication middleware
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: 'Tenant' | 'Owner' | 'Admin';
    };

    // Verify user is not suspended or deleted
    const user = await db.users.findById(decoded.id);
    if (!user) {
      return res.status(403).json({ error: 'User account no longer exists' });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account is suspended by an administrator' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
}

/**
 * Require specific role middleware
 */
export function requireRole(role: 'Tenant' | 'Owner' | 'Admin') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden: requires ${role} role` });
    }
    next();
  };
}

/**
 * Admin or specific user constraint middleware
 */
export function requireAdminOrSelf(userIdParamName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'Admin') {
      return next();
    }
    const targetUserId = req.params[userIdParamName];
    if (req.user.id === targetUserId) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: access denied' });
  };
}
