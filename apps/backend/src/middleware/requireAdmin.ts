import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to require admin role for protected routes
 * Checks user role from database after authentication
 */
export const requireAdmin = () => async (req: any, res: Response, next: NextFunction) => {
    try {
        const email = req.user?.email;
        if (!email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const [user] = await db.select().from(users).where(eq(users.email, email));
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Admin access required',
                message: 'You do not have permission to access this resource'
            });
        }
        
        // Attach full user object to request for downstream use
        req.dbUser = user;
        next();
    } catch (error) {
        console.error('Admin authorization check failed:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};
