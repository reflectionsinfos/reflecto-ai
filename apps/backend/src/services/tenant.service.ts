import { db } from "../db";
import { tenants } from "../db/schema";

export const tenantService = {
  async createTenant(name: string) {
    const [tenant] = await db.insert(tenants).values({ name }).returning();
    return tenant;
  },

  async getAllTenants() {
    return await db.select().from(tenants);
  }
};
