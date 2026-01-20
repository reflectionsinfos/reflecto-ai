
import { db } from "../db";
import { kudosCards, kudosHistory } from "../db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Clearing kudos_cards table...");
  // Clear history first due to FK, or cascade
  await db.delete(kudosHistory);
  await db.delete(kudosCards);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
