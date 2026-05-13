import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

interface CreateUserDTO {
  email: string;
  name: string;
  role?: string;
  tenantId: string;
}

export const userService = {
  async createUser(data: CreateUserDTO) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async getAllUsers() {
    return await db.select().from(users);
  },

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email)
    });
  },

  async updateUser(id: string, data: Partial<CreateUserDTO>) {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id as any)).returning();
    return updatedUser;
  }
};
