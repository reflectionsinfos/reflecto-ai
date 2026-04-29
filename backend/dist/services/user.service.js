"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.userService = {
    async createUser(data) {
        const [user] = await db_1.db.insert(schema_1.users).values(data).returning();
        return user;
    },
    async getAllUsers() {
        return await db_1.db.select().from(schema_1.users);
    },
    async getUserByEmail(email) {
        return await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email)
        });
    }
};
