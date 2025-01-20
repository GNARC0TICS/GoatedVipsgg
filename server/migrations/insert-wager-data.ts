
import { db } from '../db';
import { users, affiliateStats } from '../../db/schema';
import { eq } from 'drizzle-orm';

const wagerData = [
  {
    uid: "GqafxYNApPTE2zrOCTyB",
    name: "wongck",
    wagered: { today: 0, this_week: 0, this_month: 0, all_time: 0 }
  },
  // ... add all other users similarly
  {
    uid: "QmNzDA3ZhDFpGfGajiLw",
    name: "bless",
    wagered: { today: 0, this_week: 0, this_month: 235.28459894629322, all_time: 405.09014481085785 }
  }
];

async function migrateWagerData() {
  for (const data of wagerData) {
    // First ensure user exists
    const user = await db.insert(users)
      .values({
        username: data.name,
        email: `${data.name}@placeholder.com`, // Placeholder email
        password: 'placeholder', // Should be properly hashed in production
        isAdmin: false
      })
      .onConflictDoNothing()
      .returning()
      .execute();
      
    // Create affiliate stats entry
    if (data.wagered.all_time > 0) {
      await db.insert(affiliateStats)
        .values({
          userId: user[0].id,
          totalWager: data.wagered.all_time,
          commission: 0, // Set appropriate commission calculation
          timestamp: new Date()
        })
        .execute();
    }
  }
  
  console.log('Wager data migration completed');
}

migrateWagerData().catch(console.error);
