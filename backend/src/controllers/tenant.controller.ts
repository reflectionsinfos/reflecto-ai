import { Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
import { asyncHandler } from '../middleware/errorHandler';

export const tenantController = {
  createTenant: asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    const tenant = await tenantService.createTenant(name);
    res.json(tenant);
  }),

  getTenants: asyncHandler(async (req: Request, res: Response) => {
    const allTenants = await tenantService.getAllTenants();
    res.json(allTenants);
  })
};
