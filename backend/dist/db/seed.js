"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const schema_1 = require("./schema");
async function seed() {
    console.log("Seeding database...");
    try {
        // 1. Create Default Tenant
        console.log("Creating default tenant...");
        const [tenant] = await index_1.db
            .insert(schema_1.tenants)
            .values({
            name: "Reflections Infos Systems",
        })
            .returning();
        console.log("Tenant created:", tenant);
        // 2. Create Default Admin User
        console.log("Creating default admin user...");
        const [user] = await index_1.db
            .insert(schema_1.users)
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
    }
    catch (error) {
        console.error("Error creating seed data:", error);
        process.exit(1);
    }
}
seed();
