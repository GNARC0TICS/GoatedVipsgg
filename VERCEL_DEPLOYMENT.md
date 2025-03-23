# Vercel Deployment Guide

This document outlines the necessary changes made to optimize the application for deployment on Vercel. Vercel uses a serverless architecture which differs from the persistent server environment used in Replit.

## Key Changes

### 1. Database Connection

The database connection module (`db/connection.ts`) has been updated to use a serverless-compatible approach:

- Using `@neondatabase/serverless` for PostgreSQL connection
- Enabled connection pooling with caching for better performance
- Implemented health check functions optimized for serverless environments
- Removed explicit connection pool management that doesn't apply to serverless

### 2. File Path Case Sensitivity

Vercel runs on Linux which is case-sensitive, unlike macOS/Windows development environments:

- Fixed case sensitivity issues with file imports (e.g., `Profile.tsx` vs `profile.tsx`)
- Ensured consistent file naming conventions throughout the application

### 3. Authentication Middleware

Modified the authentication system to work properly in a serverless environment:

- Updated auth helpers to use the new database connection methods
- Created better helper functions for authentication checks
- Fixed type errors related to user information

### 4. Schema Exports

Better organized database schema exports for cleaner imports:

- Created a proper `db/schema/index.ts` file to re-export all schema definitions
- Updated imports across the application to use consistent paths

### 5. Fallback Data Handling

Enhanced fallback data capabilities for better resilience in production:

- Added environment-aware fallback data generation
- Implemented controls to enable/disable fallback data in different environments
- Created complete simulated data for development and testing

## Vercel-Specific Configurations

### Environment Variables

The following environment variables need to be set in your Vercel project settings:

- `DATABASE_URL`: Connection string for your PostgreSQL database (should support serverless)
- `JWT_SECRET`: Secret key for JWT token generation
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token (if using Telegram integration)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET_KEY`: Admin account details
- `ENABLE_FALLBACK_DATA`: Set to "true" if you want to enable fallback data in production

### Serverless Function Limits

Be aware of Vercel's limits on serverless function execution:

- Maximum execution time: 60 seconds on Pro plan
- Memory limit: 1024MB on Pro plan
- Payload size limit: 5MB

Long-running operations should be moved to background cron jobs or external services.

### API Routes

All API routes in the `server/routes` directory will be automatically deployed as serverless functions on Vercel. Ensure that:

- Functions are optimized for cold starts
- Database connections are efficiently managed
- No reliance on persistent in-memory state between requests

### Cron Jobs

For scheduled tasks, use Vercel's cron functionality in the `vercel.json` configuration file:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-leaderboard",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This example runs the leaderboard update job every 6 hours.

## Testing

Before final deployment, test thoroughly:

1. Database connections and queries
2. Authentication flows
3. API response times
4. Error handling with fallback mechanisms
5. Scheduled jobs (crons)

## Monitoring

Once deployed, monitor:

- Serverless function execution times
- Database connection efficiency
- Error rates and types
- Memory and CPU usage

Use Vercel Analytics and/or integrate with monitoring tools like Sentry for comprehensive visibility.
