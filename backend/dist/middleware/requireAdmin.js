"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Middleware to require admin role for protected routes
 * Checks user role from database after authentication
 */
const requireAdmin = () => async (req, res, next) => {
    try {
        const email = req.user?.email;
        if (!email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                error: 'Admin access required',
                message: 'You do not have permission to access this resource'
            });
        }
        // Attach full user object to request for downstream use
        req.dbUser = user;
        next();
    }
    catch (error) {
        console.error('Admin authorization check failed:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};
exports.requireAdmin = requireAdmin;
