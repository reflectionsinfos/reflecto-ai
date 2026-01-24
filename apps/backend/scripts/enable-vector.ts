import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Enabling vector extension...");
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("Vector extension enabled.");
  } catch (e) {
    console.error("Failed to enable vector extension:", e);
  }
  process.exit(0);
}

main();
