
import { db } from "../src/db";
import { kudosCards } from "../src/db/schema";
import { desc } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function verifyData() {
  console.log("Verifying Database Data...");
  try {
    const cards = await db.select().from(kudosCards).orderBy(desc(kudosCards.createdAt));
    
    console.log(`Found ${cards.length} cards in the database.`);
    
    cards.forEach((card, index) => {
      console.log(`\n--- Card ${index + 1} ---`);
      console.log(`ID: ${card.id}`);
      console.log(`Recipient: ${card.recipientName}`);
      console.log(`Creator: ${card.creatorName} (${card.creatorEmail})`);
      console.log(`Template: ${card.template}`);
      console.log(`Created At: ${card.createdAt}`);
    });

  } catch (error) {
    console.error("Error verifying data:", error);
  } finally {
    process.exit(0);
  }
}

verifyData();
