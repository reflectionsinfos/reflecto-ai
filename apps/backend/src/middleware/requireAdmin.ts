import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

// Requires authenticate() to have run first.
// If getCurrentUser already resolved req.dbUser in the same request (unlikely for
// admin routes, but safe to check), we skip the DB round-trip.
export const requireAdmin = () => async (req: any, res: Response, next: NextFunction) => {
    try {
        const email = req.user?.email;
        const azureOid = req.user?.id;

        if (!email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const dbUser = req.dbUser
            ?? (azureOid ? await userService.getUserByOid(azureOid) : null)
            ?? await userService.getUserByEmail(email);

        if (!dbUser || dbUser.role !== 'admin') {
            return res.status(403).json({
                error: 'Admin access required',
                message: 'You do not have permission to access this resource',
            });
        }

        req.dbUser = dbUser;
        next();
    } catch (error) {
        console.error('Admin authorization check failed:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};
