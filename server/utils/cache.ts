import { Mutex } from 'async-mutex';
import { log } from "../vite";

/**
 * Generic cache manager with mutex lock to prevent race conditions
 * @template T The type of data being cached
 */
export class CacheManager<T> {
  private cache: T | null = null;
  private lastFetchTime = 0;
  private cacheDuration: number;
  private mutex = new Mutex();
  private cacheVersion = 1;
  private cacheName: string;

  /**
   * Creates a new cache manager
   * @param cacheName Name of the cache for logging purposes
   * @param cacheDuration Duration in milliseconds before cache is considered stale
   */
  constructor(cacheName: string, cacheDuration: number = 60000) {
    this.cacheName = cacheName;
    this.cacheDuration = cacheDuration;
  }

  /**
   * Gets data from cache if fresh, otherwise fetches new data using the provided function
   * @param fetchFn Function to fetch fresh data when cache is stale
   * @param forceRefresh Whether to force a refresh regardless of cache freshness
   * @returns The cached or freshly fetched data
   */
  async getData(fetchFn: () => Promise<T>, forceRefresh = false): Promise<T> {
    const now = Date.now();
    
    // Return cached data if it's still fresh and no force refresh
    if (!forceRefresh && this.cache && now - this.lastFetchTime < this.cacheDuration) {
      log(`Using cached ${this.cacheName} data (version ${this.cacheVersion})`);
      return this.cache;
    }
    
    // Use mutex to prevent multiple simultaneous refreshes
    return await this.mutex.runExclusive(async () => {
      // Double-check cache inside mutex to prevent race conditions
      if (!forceRefresh && this.cache && now - this.lastFetchTime < this.cacheDuration) {
        log(`Using cached ${this.cacheName} data (version ${this.cacheVersion}) after mutex check`);
        return this.cache;
      }
      
      try {
        log(`Fetching fresh ${this.cacheName} data...`);
        const freshData = await fetchFn();
        
        // Update cache
        this.cache = freshData;
        this.lastFetchTime = Date.now();
        this.cacheVersion++;
        
        log(`Updated ${this.cacheName} cache to version ${this.cacheVersion}`);
        return freshData;
      } catch (error) {
        log(`Error fetching ${this.cacheName} data: ${error}`);
        // If there's an error, return the stale cache if available
        if (this.cache) {
          log(`Returning stale ${this.cacheName} cache due to fetch error`);
          return this.cache;
        }
        throw error;
      }
    });
  }

  /**
   * Invalidates the cache, forcing the next getData call to fetch fresh data
   */
  invalidateCache(): void {
    this.lastFetchTime = 0;
    this.cacheVersion++;
    log(`Invalidated ${this.cacheName} cache (next version will be ${this.cacheVersion})`);
  }

  /**
   * Updates the cache with the provided data without fetching
   * @param data The data to update the cache with
   */
  updateCache(data: T): void {
    this.cache = data;
    this.lastFetchTime = Date.now();
    this.cacheVersion++;
    log(`Manually updated ${this.cacheName} cache to version ${this.cacheVersion}`);
  }

  /**
   * Gets the current cache version
   * @returns The current cache version
   */
  getCacheVersion(): number {
    return this.cacheVersion;
  }

  /**
   * Gets the time elapsed since the last cache update
   * @returns Time in milliseconds since the last cache update
   */
  getCacheAge(): number {
    return Date.now() - this.lastFetchTime;
  }

  /**
   * Checks if the cache is currently fresh
   * @returns True if the cache is fresh, false otherwise
   */
  isCacheFresh(): boolean {
    return !!this.cache && (Date.now() - this.lastFetchTime < this.cacheDuration);
  }
}
