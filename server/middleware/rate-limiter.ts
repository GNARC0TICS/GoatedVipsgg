import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// Create a rate limiter instance for API endpoints
export const apiLimiter = new RateLimiterMemory({
  points: 30, // Number of points
  duration: 1, // Per second
});

// Create a separate limiter for affiliate stats
export const affiliateStatsLimiter = new RateLimiterMemory({
  points: 10, // Number of points
  duration: 1, // Per second
});

// Create a separate limiter for race data
export const raceDataLimiter = new RateLimiterMemory({
  points: 15, // Number of points
  duration: 1, // Per second
});

// Middleware factory to create rate limiters
export const createRateLimiter = (limiter: RateLimiterMemory) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use X-Forwarded-For header if available, otherwise fallback to connection remote address
      const clientIp = (req.headers['x-forwarded-for'] as string) || 
                      req.socket.remoteAddress || 
                      'unknown';

      await limiter.consume(clientIp);
      next();
    } catch (error: any) {
      res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  };
};

// Export specific middleware instances
export const apiRateLimiter = createRateLimiter(apiLimiter);
export const affiliateRateLimiter = createRateLimiter(affiliateStatsLimiter);
export const raceRateLimiter = createRateLimiter(raceDataLimiter);