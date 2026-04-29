"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserAndTenant = ensureUserAndTenant;
const index_1 = require("./index");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
async function ensureUserAndTenant(userObj) {
    try {
        console.log("ensureUserAndTenant: Starting for", userObj.email);
        // 1. Ensure Tenant Exists
        // Check if any tenant exists first (Single Tenant Mode for now)
        let [tenant] = await index_1.db.select().from(schema_1.tenants).limit(1);
        if (!tenant) {
            console.log("ensureUserAndTenant: Creating default tenant...");
            const newTenants = await index_1.db.insert(schema_1.tenants).values({ name: "Default Organization" }).returning();
            tenant = newTenants[0];
        }
        console.log("ensureUserAndTenant: Tenant ID:", tenant?.id);
        // 2. Ensure User Exists
        let [dbUser] = await index_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, userObj.email));
        if (!dbUser) {
            console.log(`ensureUserAndTenant: Creating user ${userObj.email}...`);
            const newUsers = await index_1.db.insert(schema_1.users).values({
                email: userObj.email,
                name: userObj.name,
                role: "user",
                tenantId: tenant.id
            }).returning();
            dbUser = newUsers[0];
        }
        console.log("ensureUserAndTenant: DB User found/created:", dbUser);
        if (!dbUser || !dbUser.id) {
            throw new Error(`ensureUserAndTenant: Failed to get valid user. User object: ${JSON.stringify(dbUser)}`);
        }
        return {
            tenantId: tenant.id,
            userId: dbUser.id
        };
    }
    catch (error) {
        console.error("Error syncing user/tenant:", error);
        throw error;
    }
}
