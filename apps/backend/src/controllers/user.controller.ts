import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';

export const userController = {
  getCurrentUser: asyncHandler(async (req: any, res: Response) => {
    const email = req.user?.email;
    const azureOid = req.user?.id; // auth.ts maps token.oid → req.user.id

    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // OID lookup first (immutable). Falls back to email for users who existed
    // before the azure_oid column was added.
    let user = azureOid ? await userService.getUserByOid(azureOid) : null;

    if (!user) {
      // Upsert handles three cases atomically:
      //   1. Brand-new user  → INSERT
      //   2. Existing user without OID (pre-migration) → UPDATE name + backfill OID
      //   3. Race condition (two simultaneous first logins) → second write is a no-op update
      const name = req.user?.name || email.split('@')[0];
      user = await userService.upsertUser({ email, name, role: 'user', azureOid: azureOid || null });
    } else if (req.user?.name && req.user.name !== user.name) {
      user = await userService.updateUser(user.id, { name: req.user.name });
    }

    // Attach resolved DB user so downstream middleware (e.g. requireAdmin) can
    // skip the redundant DB query.
    req.dbUser = user;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    });
  }),

  getUsers: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.query;
    if (email && typeof email === 'string') {
      const user = await userService.getUserByEmail(email);
      return res.json(user || null);
    }
    const allUsers = await userService.getAllUsers();
    res.json(allUsers);
  }),
};
