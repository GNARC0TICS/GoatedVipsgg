declare module '@db' {
  import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  import type * as schema from '@db/schema';

  export const db: PostgresJsDatabase<typeof schema>;
  export * from '@db/schema';
  export * from '@db/schema/telegram';
  export default db;
}

declare module '@db/schema' {
  import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
  import type { 
    users, 
    notificationPreferences, 
    wagerRaces, 
    wagerRaceParticipants, 
    affiliateStats, 
    supportTickets, 
    newsletterSubscriptions, 
    historicalRaces,
    goatedVerificationRequests,
    telegramVerificationRequests
  } from './schema';

  // Re-export all types and schemas
  export * from './schema';

  // Custom type exports
  export type InsertUser = InferInsertModel<typeof users>;
  export type SelectUser = InferSelectModel<typeof users>;
  export type InsertNotificationPreferences = InferInsertModel<typeof notificationPreferences>;
  export type SelectNotificationPreferences = InferSelectModel<typeof notificationPreferences>;
  export type InsertWagerRace = InferInsertModel<typeof wagerRaces>;
  export type SelectWagerRace = InferSelectModel<typeof wagerRaces>;
  export type InsertWagerRaceParticipant = InferInsertModel<typeof wagerRaceParticipants>;
  export type SelectWagerRaceParticipant = InferSelectModel<typeof wagerRaceParticipants>;
  export type InsertSupportTicket = InferInsertModel<typeof supportTickets>;
  export type SelectSupportTicket = InferSelectModel<typeof supportTickets>;
  export type InsertNewsletterSubscription = InferInsertModel<typeof newsletterSubscriptions>;
  export type SelectNewsletterSubscription = InferSelectModel<typeof newsletterSubscriptions>;
  export type InsertHistoricalRace = InferInsertModel<typeof historicalRaces>;
  export type SelectHistoricalRace = InferSelectModel<typeof historicalRaces>;
  
  // New verification types
  export type InsertGoatedVerificationRequest = InferInsertModel<typeof goatedVerificationRequests>;
  export type SelectGoatedVerificationRequest = InferSelectModel<typeof goatedVerificationRequests>;
  export type InsertTelegramVerificationRequest = InferInsertModel<typeof telegramVerificationRequests>;
  export type SelectTelegramVerificationRequest = InferSelectModel<typeof telegramVerificationRequests>;
}