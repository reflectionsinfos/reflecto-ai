"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const schema_1 = require("../db/schema");
async function main() {
    console.log("Clearing kudos_cards table...");
    // Clear history first due to FK, or cascade
    await db_1.db.delete(schema_1.kudosHistory);
    await db_1.db.delete(schema_1.kudosCards);
    console.log("Done.");
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
