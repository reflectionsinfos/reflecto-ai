import { db } from "./index";
import { tenants, users } from "./schema";
import { eq } from "drizzle-orm";

export async function ensureUserAndTenant(userObj: { email: string; name: string; tid?: string }) {
    try {
        console.log("ensureUserAndTenant: Starting for", userObj.email);
        
        // 1. Ensure Tenant Exists
        // Check if any tenant exists first (Single Tenant Mode for now)
        let [tenant] = await db.select().from(tenants).limit(1);
        
        if (!tenant) {
            console.log("ensureUserAndTenant: Creating default tenant...");
            const newTenants = await db.insert(tenants).values({ name: "Default Organization" }).returning();
            tenant = newTenants[0];
        }
        console.log("ensureUserAndTenant: Tenant ID:", tenant?.id);
        
        // 2. Ensure User Exists
        let [dbUser] = await db.select().from(users).where(eq(users.email, userObj.email));
        
        if (!dbUser) {
            console.log(`ensureUserAndTenant: Creating user ${userObj.email}...`);
            const newUsers = await db.insert(users).values({
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
    } catch (error) {
        console.error("Error syncing user/tenant:", error);
        throw error;
    }
}
