import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';

export const userController = {
  createUser: asyncHandler(async (req: Request, res: Response) => {
    const { email, name, role, tenantId } = req.body;
    const user = await userService.createUser({ email, name, role, tenantId });
    res.json(user);
  }),

  getCurrentUser: asyncHandler(async (req: any, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
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
  })
};
