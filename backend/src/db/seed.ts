import { db } from "./index";
import { tenants, users } from "./schema";

async function seed() {
  console.log("Seeding database...");

  try {
    // 1. Create Default Tenant
    console.log("Creating default tenant...");
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: "Reflections Infos Systems",
      })
      .returning();
    console.log("Tenant created:", tenant);

    // 2. Create Default Admin User
    console.log("Creating default admin user...");
    const [user] = await db
      .insert(users)
      .values({
        email: "admin@kudoscard.com",
        name: "Admin User",
        role: "admin",
        tenantId: tenant.id,
      })
      .returning();
    console.log("User created:", user);

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating seed data:", error);
    process.exit(1);
  }
}

seed();
