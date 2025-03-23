import { Mutex } from 'async-mutex';
import { log } from "../vite";
import { getRedisClient, isRedisConfigured } from './redis-client';

/**
 * Generic cache manager with mutex lock to prevent race conditions
 * Supports both Redis and in-memory caching with automatic fallback
 * @template T The type of data being cached
 */
export class CacheManager<T> {
  private memoryCache: T | null = null;
  private lastFetchTime = 0;
  private cacheDuration: number;
  private mutex = new Mutex();
  private cacheVersion = 1;
  private cacheName: string;
  private useRedis: boolean;

  /**
   * Creates a new cache manager
   * @param cacheName Name of the cache for logging purposes
   * @param cacheDuration Duration in milliseconds before cache is considered stale
   * @param useRedis Whether to use Redis for caching (if available)
   */
  constructor(cacheName: string, cacheDuration: number = 60000, useRedis: boolean = true) {
    this.cacheName = cacheName;
    this.cacheDuration = cacheDuration;
    this.useRedis = useRedis && isRedisConfigured();
    
    if (this.useRedis) {
      log(`${this.cacheName} cache using Redis storage (serverless compatible)`);
    } else {
      log(`${this.cacheName} cache using in-memory storage (not recommended for production serverless)`);
    }
  }

  /**
   * Gets the Redis key for this cache
   * @returns The Redis key
   */
  private getRedisKey(): string {
    return `cache:${this.cacheName}`;
  }

  /**
   * Gets the Redis metadata key for this cache
   * @returns The Redis metadata key
   */
  private getRedisMetaKey(): string {
    return `cache:${this.cacheName}:meta`;
  }

  /**
   * Gets data from cache if fresh, otherwise fetches new data using the provided function
   * @param fetchFn Function to fetch fresh data when cache is stale
   * @param forceRefresh Whether to force a refresh regardless of cache freshness
   * @returns The cached or freshly fetched data
   */
  async getData(fetchFn: () => Promise<T>, forceRefresh = false): Promise<T> {
    const now = Date.now();
    
    // If using Redis, try to get data from Redis
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        const meta = await redis.get<{ lastFetchTime: number, version: number }>(this.getRedisMetaKey());
        
        // If we have fresh data in Redis and not forcing refresh, return it
        if (!forceRefresh && meta && now - meta.lastFetchTime < this.cacheDuration) {
          const cachedData = await redis.get<T>(this.getRedisKey());
          if (cachedData) {
            log(`Using Redis cached ${this.cacheName} data (version ${meta.version})`);
            return cachedData;
          }
        }
      } catch (error) {
        log(`Error accessing Redis cache for ${this.cacheName}: ${error}`);
        // Fall back to memory cache on Redis error
      }
    }
    
    // If not using Redis or Redis failed, check memory cache
    if (!this.useRedis && !forceRefresh && this.memoryCache && now - this.lastFetchTime < this.cacheDuration) {
      log(`Using in-memory cached ${this.cacheName} data (version ${this.cacheVersion})`);
      return this.memoryCache;
    }
    
    // Use mutex to prevent multiple simultaneous refreshes
    return await this.mutex.runExclusive(async () => {
      // Double-check cache inside mutex to prevent race conditions
      if (this.useRedis) {
        try {
          const redis = getRedisClient();
          const meta = await redis.get<{ lastFetchTime: number, version: number }>(this.getRedisMetaKey());
          
          // If we have fresh data in Redis and not forcing refresh, return it
          if (!forceRefresh && meta && now - meta.lastFetchTime < this.cacheDuration) {
            const cachedData = await redis.get<T>(this.getRedisKey());
            if (cachedData) {
              log(`Using Redis cached ${this.cacheName} data (version ${meta.version}) after mutex check`);
              return cachedData;
            }
          }
        } catch (error) {
          log(`Error accessing Redis cache for ${this.cacheName} after mutex check: ${error}`);
          // Fall back to memory cache on Redis error
        }
      }
      
      // Check memory cache again (inside mutex)
      if (!this.useRedis && !forceRefresh && this.memoryCache && now - this.lastFetchTime < this.cacheDuration) {
        log(`Using in-memory cached ${this.cacheName} data (version ${this.cacheVersion}) after mutex check`);
        return this.memoryCache;
      }
      
      try {
        log(`Fetching fresh ${this.cacheName} data...`);
        const freshData = await fetchFn();
        
        // Update both Redis and memory cache
        if (this.useRedis) {
          try {
            const redis = getRedisClient();
            const newVersion = this.cacheVersion + 1;
            const meta = { lastFetchTime: Date.now(), version: newVersion };
            
            await redis.set(this.getRedisKey(), freshData);
            await redis.set(this.getRedisMetaKey(), meta);
            
            this.cacheVersion = newVersion;
            log(`Updated Redis ${this.cacheName} cache to version ${newVersion}`);
          } catch (error) {
            log(`Error updating Redis cache for ${this.cacheName}: ${error}`);
            // If Redis fails, still update memory cache
          }
        }
        
        // Always update memory cache as fallback
        this.memoryCache = freshData;
        this.lastFetchTime = Date.now();
        
        if (!this.useRedis) {
          this.cacheVersion++;
          log(`Updated in-memory ${this.cacheName} cache to version ${this.cacheVersion}`);
        }
        
        return freshData;
      } catch (error) {
        log(`Error fetching ${this.cacheName} data: ${error}`);
        
        // Try to get data from Redis first on error
        if (this.useRedis) {
          try {
            const redis = getRedisClient();
            const cachedData = await redis.get<T>(this.getRedisKey());
            if (cachedData) {
              log(`Returning stale Redis cached ${this.cacheName} data due to fetch error`);
              return cachedData;
            }
          } catch (redisError) {
            log(`Error accessing Redis for stale ${this.cacheName} data: ${redisError}`);
            // Fall back to memory cache
          }
        }
        
        // If Redis failed or not using Redis, check memory cache
        if (this.memoryCache) {
          log(`Returning stale in-memory ${this.cacheName} cache due to fetch error`);
          return this.memoryCache;
        }
        
        throw error;
      }
    });
  }

  /**
   * Invalidates the cache, forcing the next getData call to fetch fresh data
   */
  async invalidateCache(): Promise<void> {
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        const newVersion = this.cacheVersion + 1;
        
        // Update metadata but keep the data (just mark it as stale)
        await redis.set(this.getRedisMetaKey(), { lastFetchTime: 0, version: newVersion });
        this.cacheVersion = newVersion;
        
        log(`Invalidated Redis ${this.cacheName} cache (next version will be ${newVersion})`);
      } catch (error) {
        log(`Error invalidating Redis cache for ${this.cacheName}: ${error}`);
      }
    }
    
    // Always invalidate memory cache
    this.lastFetchTime = 0;
    if (!this.useRedis) {
      this.cacheVersion++;
      log(`Invalidated in-memory ${this.cacheName} cache (next version will be ${this.cacheVersion})`);
    }
  }

  /**
   * Updates the cache with the provided data without fetching
   * @param data The data to update the cache with
   */
  async updateCache(data: T): Promise<void> {
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        const newVersion = this.cacheVersion + 1;
        const meta = { lastFetchTime: Date.now(), version: newVersion };
        
        await redis.set(this.getRedisKey(), data);
        await redis.set(this.getRedisMetaKey(), meta);
        
        this.cacheVersion = newVersion;
        log(`Manually updated Redis ${this.cacheName} cache to version ${newVersion}`);
      } catch (error) {
        log(`Error manually updating Redis cache for ${this.cacheName}: ${error}`);
      }
    }
    
    // Always update memory cache
    this.memoryCache = data;
    this.lastFetchTime = Date.now();
    
    if (!this.useRedis) {
      this.cacheVersion++;
      log(`Manually updated in-memory ${this.cacheName} cache to version ${this.cacheVersion}`);
    }
  }

  /**
   * Gets the current cache version
   * @returns The current cache version
   */
  async getCacheVersion(): Promise<number> {
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        const meta = await redis.get<{ lastFetchTime: number, version: number }>(this.getRedisMetaKey());
        return meta?.version || this.cacheVersion;
      } catch (error) {
        log(`Error getting Redis cache version for ${this.cacheName}: ${error}`);
      }
    }
    
    return this.cacheVersion;
  }

  /**
   * Gets the time elapsed since the last cache update
   * @returns Time in milliseconds since the last cache update
   */
  async getCacheAge(): Promise<number> {
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        const meta = await redis.get<{ lastFetchTime: number, version: number }>(this.getRedisMetaKey());
        return Date.now() - (meta?.lastFetchTime || 0);
      } catch (error) {
        log(`Error getting Redis cache age for ${this.cacheName}: ${error}`);
      }
    }
    
    return Date.now() - this.lastFetchTime;
  }

  /**
   * Checks if the cache is currently fresh
   * @returns True if the cache is fresh, false otherwise
   */
  async isCacheFresh(): Promise<boolean> {
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        const meta = await redis.get<{ lastFetchTime: number, version: number }>(this.getRedisMetaKey());
        if (!meta) return false;
        
        const hasData = !!(await redis.get(this.getRedisKey()));
        return hasData && (Date.now() - meta.lastFetchTime < this.cacheDuration);
      } catch (error) {
        log(`Error checking Redis cache freshness for ${this.cacheName}: ${error}`);
      }
    }
    
    return !!this.memoryCache && (Date.now() - this.lastFetchTime < this.cacheDuration);
  }
  
  /**
   * Gets the current cached data, even if stale
   * @returns The cached data or null if no data is cached
   */
  async getCachedData(): Promise<T | null> {
    if (this.useRedis) {
      try {
        const redis = getRedisClient();
        return await redis.get<T>(this.getRedisKey());
      } catch (error) {
        log(`Error getting Redis cached data for ${this.cacheName}: ${error}`);
      }
    }
    
    return this.memoryCache;
  }
}
