"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
exports.tenantService = {
    async createTenant(name) {
        const [tenant] = await db_1.db.insert(schema_1.tenants).values({ name }).returning();
        return tenant;
    },
    async getAllTenants() {
        return await db_1.db.select().from(schema_1.tenants);
    }
};
