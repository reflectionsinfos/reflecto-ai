import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

interface UpsertUserDTO {
  email: string;
  name: string;
  role?: string;
  azureOid?: string | null;
  tenantId?: string | null;
}

export const userService = {
  // Upsert: inserts new user or updates name/azureOid on email conflict.
  // Using onConflictDoUpdate also eliminates the race condition on first login.
  async upsertUser(data: UpsertUserDTO) {
    const [user] = await db
      .insert(users)
      .values({ role: 'user', ...data })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: data.name,
          ...(data.azureOid ? { azureOid: data.azureOid } : {}),
        },
      })
      .returning();
    return user;
  },

  async getAllUsers() {
    return await db.select().from(users);
  },

  async getUserByOid(azureOid: string) {
    return db.query.users.findFirst({ where: eq(users.azureOid, azureOid) });
  },

  async getUserByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },

  async updateUser(id: string, data: Partial<UpsertUserDTO>) {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id as any))
      .returning();
    return updatedUser;
  },
};
