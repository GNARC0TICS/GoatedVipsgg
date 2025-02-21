import { db } from "@db";
import { transformationLogs } from "@db/schema";
import { eq } from "drizzle-orm";
import { getBotConfig } from "../config";

interface CacheEntry {
  key: string;
  value: any;
  expiresAt: Date;
}

export class DatabaseCache {
  private config = getBotConfig();

  async get(key: string): Promise<any | null> {
    try {
      const [entry] = await db
        .select()
        .from(transformationLogs)
        .where(eq(transformationLogs.type, `cache:${key}`))
        .orderBy(transformationLogs.createdAt, "desc")
        .limit(1);

      if (!entry || new Date(entry.createdAt!) > new Date()) {
        return null;
      }

      return JSON.parse(entry.message);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.config.cacheTimeout);

      await db.insert(transformationLogs).values({
        type: `cache:${key}`,
        message: JSON.stringify(value),
        duration: this.config.cacheTimeout,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }
}

// Export singleton instance
export const cache = new DatabaseCache();
