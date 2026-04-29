/**
 * Seed script for default kudos messages.
 * Run with: npm run seed:messages
 *
 * This script populates the message_templates table with the 50 default messages
 * that were previously hardcoded in the frontend.
 */

import "../config/env";
import { db } from "../db";
import { messageTemplates } from "../db/schema";


const DEFAULT_MESSAGES = {
  "customer-centricity": {
    individual: [
      "You put customers first in every choice, turning moments into wins. Your care and empathy make you our Customer Centric Champion!",
      "Every step you take puts customers at heart. Your empathy, clarity and hustle turn needs to smiles-our Customer Centric Champion!",
      "Your customer-first focus shines daily-listening deeply solving swiftly, delivering delight. You're our Customer Centric Champion!",
      "You anticipate needs, remove friction, and deliver joy. Your heart and hustle help customers thrive-our Customer Centric Champion!",
      "With patience, clarity and action, you turn feedback into impact. Customers feel seen and supported-our Customer Centric Champion!",
    ],
    team: [
      "The team puts customers first, turning moments into wins. Your collective care and empathy make you our Customer Centric Champions!",
      "Every step the team takes puts customers at heart. Your empathy and hustle turn needs to smiles-our Customer Centric Champions!",
      "The team's focus shines daily-listening deeply, solving swiftly, delivering delight. You're our Customer Centric Champions!",
      "The team anticipates needs and delivers joy. Your heart and hustle help customers thrive-our Customer Centric Champions!",
      "With patience and action, the team turns feedback into impact. Customers feel seen and supported-our Customer Centric Champions!",
    ],
  },
  agility: {
    individual: [
      "You pivot with purpose, embrace change with courage, and turn challenges into opportunities. Your agility drives our success forward!",
      "Quick thinking, faster action-you adapt seamlessly to new demands. Your flexibility keeps our team moving at lightning speed!",
      "Change doesn't slow you down, it energizes you! Your ability to shift gears and innovate makes you our Agility Champion!",
      "You dance with uncertainty and make it look easy. Your responsive mindset and swift execution inspire us all to stay nimble!",
      "From roadblocks to breakthroughs, you navigate change with grace. Your agile spirit transforms obstacles into stepping stones!",
    ],
    team: [
      "The team pivots with purpose and turns challenges into opportunities. Your agility drives our success forward!",
      "Quick thinking, faster action-the team adapts seamlessly. Your flexibility keeps our organization moving at lightning speed!",
      "Change energizes the team! Your ability to shift gears and innovate makes you our Agility Champions!",
      "The team dances with uncertainty and makes it look easy. Your responsive mindset inspires us all to stay nimble!",
      "From roadblocks to breakthroughs, the team navigates change with grace. Your agile spirit transforms obstacles into stepping stones!",
    ],
  },
  "continuous-improvement": {
    individual: [
      "You never settle for 'good enough'-always seeking better ways. Your growth mindset elevates everything you touch!",
      "Every day you level up, learn more, and lift others. Your commitment to improvement makes our entire team stronger!",
      "You turn feedback into fuel and mistakes into mastery. Your dedication to growth inspires continuous excellence around you!",
      "Small steps, big impact-you consistently refine and enhance. Your improvement journey creates waves of positive change!",
      "You question the status quo and build better solutions. Your relentless pursuit of excellence drives our collective success!",
    ],
    team: [
      "The team never settles for 'good enough'. Your growth mindset elevates everything you touch!",
      "Every day the team levels up and lifts others. Your commitment to improvement makes our entire organization stronger!",
      "The team turns feedback into fuel. Your dedication to growth inspires continuous excellence around you!",
      "Small steps, big impact-the team consistently refines and enhances. Your improvement journey creates waves of positive change!",
      "The team questions the status quo. Your relentless pursuit of excellence drives our collective success!",
    ],
  },
  collaboration: {
    individual: [
      "You bring people together and make magic happen. Your collaborative spirit turns individual talents into team triumphs!",
      "You listen deeply, share generously, and build bridges. Your teamwork creates connections that strengthen our entire organization!",
      "You make everyone around you better through partnership. Your collaborative approach transforms good ideas into great results!",
      "You unite diverse perspectives into powerful solutions. Your ability to foster teamwork creates extraordinary outcomes for all!",
      "You share knowledge, celebrate others, and build trust. Your collaborative leadership makes our team unstoppable together!",
    ],
    team: [
      "The team brings people together and makes magic happen. Your collaborative spirit turns individual talents into team triumphs!",
      "The team shares generously and builds bridges. Your teamwork creates connections that strengthen our entire organization!",
      "The team makes everyone better through partnership. Your collaborative approach transforms good ideas into great results!",
      "The team unites diverse perspectives. Your ability to foster teamwork creates extraordinary outcomes for all!",
      "The team builds trust. Your collaborative leadership makes our organization unstoppable together!",
    ],
  },
  accountability: {
    individual: [
      "You own your commitments and deliver with integrity. Your accountability sets the standard for excellence and trust!",
      "You take responsibility, follow through, and make things happen. Your reliable leadership inspires confidence in everyone!",
      "You stand behind your work and support your team. Your accountability creates a culture of trust and high performance!",
      "You deliver on promises and own the outcomes. Your responsible approach builds the foundation for our collective success!",
      "You step up, speak up, and show up consistently. Your accountability drives results and earns respect from all around you!",
    ],
    team: [
      "The team owns its commitments. Your accountability sets the standard for excellence and trust!",
      "The team takes responsibility and makes things happen. Your reliable leadership inspires confidence in everyone!",
      "The team stands behind its work. Your accountability creates a culture of trust and high performance!",
      "The team delivers on promises. Your responsible approach builds the foundation for our collective success!",
      "The team shows up consistently. Your accountability drives results and earns respect from all around you!",
    ],
  },
};

async function seed() {
  try {
    console.log("Starting seed for default messages...");

    const valuesToInsert: any[] = [];

    // Build insert values for all default messages
    for (const [templateId, categories] of Object.entries(DEFAULT_MESSAGES)) {
      for (const [category, messages] of Object.entries(categories)) {
        (messages as string[]).forEach((text, index) => {
          valuesToInsert.push({
            templateId,
            templateType: "system",
            messageCategory: category,
            order: index + 1, // 1-indexed
            text,
            createdBy: null, // null for system defaults
            isPublic: true,
          });
        });
      }
    }

    console.log(`Inserting ${valuesToInsert.length} default messages...`);

    // Insert all messages
    await db.insert(messageTemplates).values(valuesToInsert);

    console.log("✓ Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  }
}

seed();
