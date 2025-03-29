import { users, userSessions, userActivityLog } from "./tables";

// User types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

// User session types
export type InsertUserSession = typeof userSessions.$inferInsert;
export type SelectUserSession = typeof userSessions.$inferSelect;

// User activity log types
export type InsertUserActivityLog = typeof userActivityLog.$inferInsert;
export type SelectUserActivityLog = typeof userActivityLog.$inferSelect;

// Common types
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  bio?: string;
  profileColor?: string;
  goatedUid?: string;
  goatedUsername?: string;
  isGoatedVerified: boolean;
  telegramId?: string;
  telegramUsername?: string;
  isTelegramVerified: boolean;
}

export interface SessionInfo {
  id: number;
  userId: number;
  sessionToken: string;
  userAgent?: string;
  ipAddress?: string;
  lastActive: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface ActivityLogEntry {
  id: number;
  userId: number;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
