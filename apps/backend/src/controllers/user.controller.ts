import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';

export const userController = {
  createUser: asyncHandler(async (req: Request, res: Response) => {
    const { email, name, role, tenantId } = req.body;
    const user = await userService.createUser({ email, name, role, tenantId });
    res.json(user);
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
