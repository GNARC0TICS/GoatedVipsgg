import { Redis } from '@upstash/redis';
import { log } from "../vite";

// Environment variables for Redis configuration
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_TOKEN = process.env.REDIS_TOKEN || '';

// Create Redis client singleton
let redisClient: Redis | null = null;

/**
 * Initialize Redis client if not already initialized
 * @returns The Redis client instance
 */
export function getRedisClient(): Redis {
  // Check if Redis is configured
  const isRedisConfigured = REDIS_URL && REDIS_TOKEN;
  
  if (!redisClient && isRedisConfigured) {
    log('Initializing Redis client for serverless caching');
    redisClient = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    });
  } else if (!isRedisConfigured) {
    // If Redis is not configured, log a warning but don't throw an error
    // This allows the app to fall back to in-memory caching
    log('WARNING: Redis not configured. Falling back to in-memory caching, which is not recommended for production.');
  }
  
  return redisClient as Redis;
}

/**
 * Checks if Redis is properly configured and available
 * @returns True if Redis is configured, false otherwise
 */
export function isRedisConfigured(): boolean {
  return !!(REDIS_URL && REDIS_TOKEN);
}

/**
 * Test the Redis connection
 * @returns Promise<boolean> True if connection is successful, false otherwise
 */
export async function testRedisConnection(): Promise<boolean> {
  if (!isRedisConfigured()) {
    return false;
  }
  
  try {
    const client = getRedisClient();
    await client.ping();
    log('Redis connection test successful');
    return true;
  } catch (error) {
    log(`Redis connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
