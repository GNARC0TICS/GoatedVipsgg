
# Codebase Overview

This document provides a visual structure of the codebase, highlighting key files and their relationships.

## Project Structure

```
.
├── client                  # Frontend application
│   ├── src                 # Source code
│   │   ├── components      # Reusable UI components
│   │   │   ├── ui          # Shadcn UI components
│   │   │   └── ...         # Custom components
│   │   ├── contexts        # React contexts
│   │   ├── hooks           # Custom React hooks
│   │   ├── lib             # Utility libraries
│   │   ├── pages           # Application pages/routes
│   │   └── utils           # Helper functions
│   ├── index.html          # Entry HTML file
│   └── tailwind.config.ts  # Tailwind CSS configuration
├── db                      # Database integration
│   ├── schema              # Database schema definitions
│   │   ├── telegram.ts     # Telegram-related schemas
│   │   └── users.ts        # User-related schemas
│   ├── connection.ts       # Enhanced database connection with production optimizations
│   ├── index.ts            # Database connection setup
│   └── schema.ts           # Main schema file with exports
├── server                  # Backend server
│   ├── telegram            # Telegram bot implementation
│   │   ├── commands        # Bot command modules
│   │   ├── utils           # Bot utility functions
│   │   └── bot.ts          # Main bot implementation
│   ├── config              # Server configuration
│   ├── middleware          # Express middleware
│   │   ├── error-handler.ts # Enhanced error handling middleware
│   │   ├── rate-limiter.ts  # API rate limiting
│   │   └── ...             # Other middleware
│   ├── routes.ts           # API routes definition
│   └── index.ts            # Server entry point with production optimizations
├── PRODUCTION.md           # Production deployment guide
└── config files            # Various configuration files
    ├── .env.example        # Example environment variables template
    ├── drizzle.config.ts   # Drizzle ORM configuration
    ├── package.json        # Node.js dependencies
    ├── tailwind.config.ts  # Tailwind CSS configuration
    ├── tsconfig.json       # TypeScript configuration
    └── vite.config.ts      # Vite bundler configuration
```

## Key Components

### Frontend (client/)

#### Components

- **UI Components (`client/src/components/ui/`)**: Shadcn UI components used throughout the application
- **Custom Components (`client/src/components/`)**: Application-specific components like:
  - `AffiliateStats.tsx`: Displays affiliate statistics
  - `LeaderboardTable.tsx`: Renders user leaderboards
  - `RaceTimer.tsx`: Timer component for wager races
  - `ErrorBoundary.tsx`: Enhanced error boundary for better error handling

#### Pages

- **Main Pages (`client/src/pages/`)**: Application routes including:
  - `Dashboard.tsx`: User dashboard
  - `WagerRaces.tsx`: Wager races page
  - `Leaderboard.tsx`: Leaderboard display
  - `Challenges.tsx`: User challenges
  - `Telegram.tsx`: Telegram integration page

#### Hooks & Utilities

- **Custom Hooks (`client/src/hooks/`)**: React hooks for data fetching and UI state management
  - `use-leaderboard.ts`: Data fetching for leaderboards
  - `use-api-with-loading.ts`: API integration with loading states
  - `use-user.ts`: User authentication state management

### Backend (server/)

#### Middleware (server/middleware/)

- **Error Handling (`server/middleware/error-handler.ts`)**: Enhanced error handling with structured responses
- **Rate Limiting (`server/middleware/rate-limiter.ts`)**: API rate limiting for security and stability
- **Authentication (`server/middleware/auth.ts`)**: User authentication middleware

#### Telegram Bot (server/telegram/)

- **Commands (`server/telegram/commands/`)**: Bot command implementations

  - `verify.ts`: Account verification command
  - `verify-user.ts`: Admin verification command
  - `leaderboard.ts`: Leaderboard display command
  - `challenge.ts`: Challenge creation and management
  - `challenge-entry.ts`: Challenge participation commands
  - `stats.ts`: User statistics command
  - `help.ts`: Help command

- **Utilities (`server/telegram/utils/`)**: Support functions for bot operations
  - `api.ts`: API client for external endpoints
  - `auth.ts`: Authentication and permissions
  - `config.ts`: Bot configuration
  - `state.ts`: Bot state management
  - `logger.ts`: Logging system

#### API Routes

- **Main Routes (`server/routes.ts`)**: API endpoints for frontend integration
- **Authentication (`server/auth.ts`)**: User authentication setup
- **Verification (`server/verification-routes.ts`)**: Account verification endpoints

### Database (db/)

#### Connection Management

- **Enhanced Connection (`db/connection.ts`)**: Production-optimized database connection with:
  - Connection pooling
  - Health check functionality
  - Graceful shutdown handling
  - WebSocket support for production

#### Schemas

- **Telegram Schemas (`db/schema/telegram.ts`)**:

  - `telegramUsers`: Telegram user records
  - `telegramBotState`: Bot state persistence
  - `verificationRequests`: Account verification requests
  - `challenges`: Challenge definitions
  - `challengeEntries`: User challenge entries

- **User Schemas (`db/schema/users.ts`)**:
  - `users`: Platform user records
  - User-related data definitions

## Production Enhancements

### Security

- **Helmet Integration**: Security headers for production environment
- **Rate Limiting**: Tiered rate limiting for API endpoints
- **Error Handling**: Structured error responses with appropriate information hiding in production
- **Environment Variables**: Secure management with .env.example template

### Performance

- **Database Optimization**: Connection pooling and WebSocket support for production
- **Graceful Shutdown**: Proper resource cleanup on server shutdown
- **Health Monitoring**: Enhanced health check endpoint with service status

### Reliability

- **Error Boundaries**: Improved client-side error handling
- **API Caching**: Session-based caching for API responses
- **Structured Logging**: Better logging for debugging and monitoring

## Data Flow

1. **User Flow**:

   - Users interact with the frontend React application
   - API requests are made to backend endpoints
   - Authentication is handled through the auth system

2. **Telegram Bot Flow**:

   - Users send commands to the Telegram bot
   - Commands are processed by the appropriate handler
   - Database queries validate and update user data
   - Responses are sent back to the user

3. **Challenge System Flow**:
   - Admins create challenges via Telegram bot
   - Users submit entries with proof of participation
   - Admins review and approve entries
   - Rewards are distributed via bonus codes

## Development Guidelines

- Frontend uses TypeScript React with Shadcn UI components
- Database uses Drizzle ORM with PostgreSQL
- Telegram bot uses node-telegram-bot-api
- Authentication uses Passport.js
- State management combines React Context and React Query

## Deployment

See `PRODUCTION.md` for detailed deployment instructions and best practices.


# Database Overview

This document provides a comprehensive overview of the database architecture for our affiliate marketing platform, including data models, relationships, and how data is used throughout the application.

## Core Database Architecture

Our platform uses PostgreSQL with Drizzle ORM for data management. The database connection is managed through Neon's serverless Postgres offering which provides scalability and reliability.

```
Connection: @neondatabase/serverless
ORM: drizzle-orm
Schema Validation: drizzle-zod, zod
```

## Data Models

### User Management

#### `users` Table

Stores core user information for authentication and identification. This table represents registered users on our platform and can be linked to Goated.com accounts.

| Field              | Type      | Description                                    |
| ------------------ | --------- | ---------------------------------------------- |
| id                 | serial    | Primary key                                    |
| username           | text      | Unique username (for platform login)           |
| password           | text      | Hashed password                                |
| email              | text      | Unique email                                   |
| isAdmin            | boolean   | Admin status flag                              |
| createdAt          | timestamp | Account creation date                          |
| lastLogin          | timestamp | Last login timestamp                           |
| goatedUid          | text      | Linked Goated.com UID (if verified)            |
| goatedUsername     | text      | Linked Goated.com username (if verified)       |
| isGoatedVerified   | boolean   | Whether user has verified Goated.com ownership |
| goatedVerifiedAt   | timestamp | When Goated.com verification occurred          |
| telegramId         | text      | Linked Telegram ID (if verified)               |
| telegramUsername   | text      | Linked Telegram username (if verified)         |
| isTelegramVerified | boolean   | Whether user has verified Telegram ownership   |
| telegramVerifiedAt | timestamp | When Telegram verification occurred            |

#### `notificationPreferences` Table

Controls user notification settings across different channels.

| Field              | Type      | Description                  |
| ------------------ | --------- | ---------------------------- |
| id                 | serial    | Primary key                  |
| userId             | integer   | Foreign key to users         |
| wagerRaceUpdates   | boolean   | Wager race notifications     |
| vipStatusChanges   | boolean   | VIP status notifications     |
| promotionalOffers  | boolean   | Marketing notifications      |
| monthlyStatements  | boolean   | Monthly report notifications |
| emailNotifications | boolean   | Email channel enabled        |
| pushNotifications  | boolean   | Push channel enabled         |
| updatedAt          | timestamp | Last updated timestamp       |

### Affiliate Marketing System

#### `affiliateStats` Table

Tracks affiliate marketing performance metrics.

| Field      | Type      | Description          |
| ---------- | --------- | -------------------- |
| id         | serial    | Primary key          |
| userId     | integer   | Foreign key to users |
| totalWager | decimal   | Total wager amount   |
| commission | decimal   | Commission earned    |
| timestamp  | timestamp | Recording timestamp  |

### Wager Race Competition System

#### `wagerRaces` Table

Defines wager race competitions with timeframes and prize pools.

| Field             | Type      | Description                           |
| ----------------- | --------- | ------------------------------------- |
| id                | serial    | Primary key                           |
| title             | text      | Race title                            |
| type              | text      | Race type (weekly/monthly/weekend)    |
| status            | text      | Race status (upcoming/live/completed) |
| prizePool         | decimal   | Total prize amount                    |
| startDate         | timestamp | Competition start date                |
| endDate           | timestamp | Competition end date                  |
| minWager          | decimal   | Minimum wager to qualify              |
| prizeDistribution | jsonb     | Prize distribution structure          |
| createdBy         | integer   | Admin who created the race            |
| createdAt         | timestamp | Creation timestamp                    |
| updatedAt         | timestamp | Last update timestamp                 |
| rules             | text      | Race rules                            |
| description       | text      | Race description                      |

#### `wagerRaceParticipants` Table

Tracks user participation in wager races.

| Field         | Type      | Description                  |
| ------------- | --------- | ---------------------------- |
| id            | serial    | Primary key                  |
| race_id       | integer   | Foreign key to wagerRaces    |
| user_id       | integer   | Foreign key to users         |
| total_wager   | decimal   | User's total wager in race   |
| rank          | integer   | Final rank in competition    |
| joined_at     | timestamp | Join timestamp               |
| updated_at    | timestamp | Last update timestamp        |
| wager_history | jsonb     | Historical wager progression |

#### `historicalRaces` Table

Archives completed wager races for historical reference.

| Field            | Type      | Description               |
| ---------------- | --------- | ------------------------- |
| id               | serial    | Primary key               |
| month            | integer   | Month number              |
| year             | integer   | Year number               |
| prizePool        | decimal   | Total prize pool          |
| startDate        | timestamp | Start date                |
| endDate          | timestamp | End date                  |
| participants     | jsonb     | Participant data snapshot |
| totalWagered     | decimal   | Total amount wagered      |
| participantCount | integer   | Number of participants    |
| status           | text      | Race status (completed)   |
| createdAt        | timestamp | Creation timestamp        |
| metadata         | jsonb     | Additional metadata       |

### Telegram Bot Integration

#### `telegramUsers` Table

Links Telegram users to both platform accounts and Goated.com accounts, serving as part of the three-way account linking system.

| Field                | Type      | Description                                             |
| -------------------- | --------- | ------------------------------------------------------- |
| telegramId           | text      | Primary key (Telegram ID)                               |
| telegramUsername     | text      | Telegram username                                       |
| platformUserId       | integer   | Foreign key to our platform's users table (when linked) |
| goatedUsername       | text      | Goated.com username from API                            |
| goatedUid            | text      | Goated.com unique identifier from API                   |
| isVerified           | boolean   | Verification status                                     |
| createdAt            | timestamp | Record creation timestamp                               |
| lastActive           | timestamp | Last activity timestamp                                 |
| notificationsEnabled | boolean   | Notification preferences                                |
| verifiedAt           | timestamp | Verification timestamp                                  |
| verifiedBy           | text      | Admin who verified                                      |
| updatedAt            | timestamp | Last update timestamp                                   |

#### `goatedVerificationRequests` Table

Manages verification requests for linking Goated.com accounts to platform accounts.

| Field          | Type      | Description                        |
| -------------- | --------- | ---------------------------------- |
| id             | serial    | Primary key                        |
| platformUserId | integer   | Foreign key to users table         |
| goatedUsername | text      | Goated.com username to verify      |
| goatedUid      | text      | Goated.com UID to verify           |
| requestedAt    | timestamp | Request submission timestamp       |
| status         | text      | Status (pending/approved/rejected) |
| adminNotes     | text      | Optional admin notes               |
| verifiedAt     | timestamp | When verification action occurred  |
| verifiedBy     | integer   | Admin user ID who took action      |
| updatedAt      | timestamp | Last update timestamp              |

#### `telegramVerificationRequests` Table

Manages verification requests for linking Telegram accounts to platform accounts.

| Field            | Type      | Description                        |
| ---------------- | --------- | ---------------------------------- |
| id               | serial    | Primary key                        |
| platformUserId   | integer   | Foreign key to users table         |
| telegramId       | text      | Telegram user ID to verify         |
| telegramUsername | text      | Telegram username                  |
| requestedAt      | timestamp | Request submission timestamp       |
| status           | text      | Status (pending/approved/rejected) |
| adminNotes       | text      | Optional admin notes               |
| verifiedAt       | timestamp | When verification action occurred  |
| verifiedBy       | integer   | Admin user ID who took action      |
| updatedAt        | timestamp | Last update timestamp              |

#### `challenges` Table

Defines gamified challenges distributed via Telegram.

| Field       | Type      | Description           |
| ----------- | --------- | --------------------- |
| id          | serial    | Primary key           |
| game        | text      | Game type             |
| multiplier  | text      | Required multiplier   |
| minBet      | text      | Minimum bet amount    |
| prizeAmount | text      | Prize amount          |
| maxWinners  | integer   | Maximum winner count  |
| timeframe   | text      | Challenge duration    |
| description | text      | Challenge description |
| status      | text      | Challenge status      |
| createdAt   | timestamp | Creation timestamp    |
| createdBy   | text      | Admin who created     |
| updatedAt   | timestamp | Last update timestamp |

#### `challengeEntries` Table

Tracks user submissions for challenges.

| Field       | Type      | Description               |
| ----------- | --------- | ------------------------- |
| id          | serial    | Primary key               |
| challengeId | integer   | Foreign key to challenges |
| telegramId  | text      | Participant's Telegram ID |
| betLink     | text      | Proof of bet link         |
| status      | text      | Entry status              |
| bonusCode   | text      | Bonus code provided       |
| submittedAt | timestamp | Submission timestamp      |
| verifiedAt  | timestamp | Verification timestamp    |
| verifiedBy  | text      | Admin who verified        |
| updatedAt   | timestamp | Last update timestamp     |

### Support System

#### `supportTickets` Table

Customer support ticketing system.

| Field       | Type      | Description              |
| ----------- | --------- | ------------------------ |
| id          | serial    | Primary key              |
| userId      | integer   | Foreign key to users     |
| subject     | text      | Ticket subject           |
| description | text      | Issue description        |
| status      | text      | Ticket status            |
| priority    | text      | Priority level           |
| createdAt   | timestamp | Creation timestamp       |
| updatedAt   | timestamp | Last update timestamp    |
| assignedTo  | integer   | Staff assigned to ticket |

#### `ticketMessages` Table

Messages within support tickets.

| Field        | Type      | Description                   |
| ------------ | --------- | ----------------------------- |
| id           | serial    | Primary key                   |
| ticketId     | integer   | Foreign key to supportTickets |
| userId       | integer   | Message sender                |
| message      | text      | Message content               |
| createdAt    | timestamp | Creation timestamp            |
| isStaffReply | boolean   | Staff message flag            |

### Marketing Tools

#### `bonusCodes` Table

Promotional bonus codes for marketing campaigns.

| Field       | Type      | Description        |
| ----------- | --------- | ------------------ |
| id          | serial    | Primary key        |
| code        | text      | Unique bonus code  |
| description | text      | Code description   |
| value       | text      | Bonus value        |
| expiresAt   | timestamp | Expiration date    |
| createdAt   | timestamp | Creation timestamp |
| expired     | boolean   | Expired status     |
| createdBy   | integer   | Admin who created  |

#### `newsletterSubscriptions` Table

Email newsletter subscription management.

| Field          | Type      | Description                |
| -------------- | --------- | -------------------------- |
| id             | serial    | Primary key                |
| email          | text      | Subscriber email           |
| isSubscribed   | boolean   | Active subscription status |
| subscribedAt   | timestamp | Subscribe timestamp        |
| unsubscribedAt | timestamp | Unsubscribe timestamp      |
| source         | text      | Subscription source        |

## Key Relationships

1. **User-centric Relationships**:

   - A user has one notification preference profile
   - A user can participate in multiple wager races
   - A user can create multiple wager races (as admin)
   - A user can have multiple affiliate statistics entries
   - A user can create and be assigned to support tickets

2. **Account Linking Relationships**:

   - A platform user can claim/link to one Goated.com account (identified by uid and name)
   - A platform user can link to one Telegram account
   - A Goated.com account (represented by API data) has one corresponding platform user after claiming
   - Initially, placeholder accounts exist for all Goated.com users without linked platform users
   - Foreign key relationships are transformed during the account claiming process

3. **Wager Race Relationships**:

   - A wager race has one creator (admin user)
   - A wager race has many participants
   - Completed wager races are archived in historical races
   - Race participation is recorded for both claimed and unclaimed Goated.com accounts

4. **Verification and Account Linking**:
   - A platform user can submit multiple verification requests but only have one approved verification per account type
   - Each verification request has a status (pending/approved/rejected) and admin notes
   - An admin user can review and approve/reject verification requests
   - Verification requests maintain an audit trail of approvals and rejections
   - When approved, the user record is updated with the verified account details
   - Both Goated.com and Telegram verifications follow the same pattern but are stored in separate tables
   - All verification actions require admin approval for security

## Data Flow and Transformation

### Raw API Data Processing

The platform integrates with external APIs to gather affiliate marketing data, which is then processed and stored in our database. Below is a step-by-step explanation of how raw API data is transformed and stored:

1. **External API Data Format**:

   The system retrieves raw data in this format:

   ```json
   {
     "status": "success",
     "metadata": {
       "totalUsers": 50,
       "lastUpdated": "2024-01-26T20:11:49.000Z"
     },
     "data": {
       "monthly": {
         "data": [
           {
             "uid": "QBbCmlNl63xCjX3S7OZL",
             "name": "Yels789",
             "wagered": {
               "today": 0,
               "this_week": 15000,
               "this_month": 45000,
               "all_time": 120000
             }
           }
           // More users...
         ]
       }
     }
   }
   ```

2. **Data Fetching Process**:

   - Scheduled job runs every 15 minutes to fetch fresh data
   - Request is made to the external API endpoint with authentication
   - Response is validated for proper structure and completeness
   - On success, processing pipeline is initiated
   - On failure, retry mechanism activates with exponential backoff

3. **Data Transformation Pipeline**:

   - Raw JSON response is parsed and validated
   - Data is normalized into consistent format
   - User identifiers are matched with internal database user IDs
   - Timestamps are converted to UTC and standardized format
   - Wager amounts are converted to decimal with fixed precision
   - Calculation of derived metrics (ranking, percentages, growth rates)

4. **Database Storage Process**:

   - For each user in the response:
     - User's existing records are retrieved from `affiliateStats` table
     - New values are compared with existing values to detect changes
     - If new data differs, transaction is initiated to update records
     - New records are inserted with timestamp and full wager data
     - Historical trends are calculated and stored
     - User is added to wager race participants if eligible

5. **Specific Database Field Mapping**:
   | API Field | Database Table | Database Field | Transformation |
   |-----------|----------------|----------------|----------------|
   | `uid` | `affiliateStats` | `userId` (after mapping) | Mapped to internal user ID |
   | `name` | Reference only | N/A | Used for verification and debugging |
   | `wagered.today` | `affiliateStats` | Part of daily stats | Stored in daily snapshot |
   | `wagered.this_week` | `affiliateStats` | Part of weekly stats | Used for weekly totals |
   | `wagered.this_month` | `affiliateStats` | `totalWager` | Direct mapping for current month |
   | `wagered.all_time` | `affiliateStats` | Part of historical data | Stored for lifetime metrics |
   | `metadata.lastUpdated` | `affiliateStats` | `timestamp` | Stored as record timestamp |
   | `metadata.totalUsers` | System metrics | N/A | Used for monitoring and alerts |

6. **Wager Race Integration**:

   - Current active races are identified
   - For each participant in the API data:
     - Check if user meets minimum wager requirement for race
     - If new participant, create entry in `wagerRaceParticipants`
     - Update `total_wager` field with latest amount
     - Append to `wager_history` JSONB field with timestamp and amount
     - Calculate and update current rank in the competition
   - Trigger notifications for significant rank changes

7. **Leaderboard Computation**:
   - After all updates, recalculate leaderboard positions
   - Sort all participants by total wager amount in descending order
   - Update rank field for each participant
   - Generate leaderboard caches for different time periods (daily, weekly, monthly)
   - Store timestamp of last leaderboard update

### Wager Race System

1. **Race Creation Flow**:

   - Admin creates a wager race with parameters (timeframe, prize pool, etc.)
   - Race is stored in `wagerRaces` table with 'upcoming' status
   - When start date is reached, status changes to 'live'
   - WebSocket notifications sent to all clients when race status changes

2. **Participant Tracking**:

   - Users join races by placing wagers that meet minimum criteria
   - Entry recorded in `wagerRaceParticipants` table
   - Wager totals updated periodically from external API
   - Wager history tracked over time in the `wager_history` JSONB field

3. **Race Completion Process**:
   - When end date is reached, race status changes to 'completed'
   - Final rankings calculated based on total wager amounts
   - Prize distribution applied according to predefined percentages
   - Race data archived to `historicalRaces` table for historical reference
   - New race automatically created for next period

### Affiliate Marketing System

1. **Performance Tracking**:

   - Affiliate statistics fetched from external API
   - Transformed and stored in `affiliateStats` table
   - Aggregated for leaderboard displays
   - Used to calculate commission earnings

2. **Real-time Updates**:
   - WebSocket connections provide real-time stat updates
   - Polling fallback ensures data consistency
   - Rate limiting prevents API abuse

### Account Synchronization System

1. **Three-Way Account Linking**:
   - Our platform uniquely integrates three separate identity spaces:
     - Platform Account: Created when users register on our website
     - Goated.com Account: External account with wager stats (accessed via API)
     - Telegram Account: For bot interactions and real-time notifications
2. **Verification System**:

   - `goatedVerificationRequests` Table: Manages verification requests for Goated.com accounts
     - Contains user-submitted Goated.com usernames and UIDs
     - Admin must manually verify each request for security
     - Tracks verification status, timestamp, and admin notes
   - `telegramVerificationRequests` Table: Manages verification requests for Telegram accounts
     - Contains user-submitted Telegram usernames and IDs
     - Admin must manually verify each request for security
     - Tracks verification status, timestamp, and admin notes
   - User Verification Flow:
     1. User submits verification request from platform
     2. Admin reviews request in admin panel
     3. Admin approves or rejects with optional notes
     4. On approval, user record updated with verified status and account details
     5. Verification request marked as approved and timestamped

3. **Placeholder Accounts**:
   - All Goated.com users have placeholder accounts on our platform
   - Key fields automatically populated:
     - `uid`: Unique identifier from Goated.com
     - `name`: Username from Goated.com
     - Wager statistics: All wager data from the API
   - These accounts initially exist without direct user access
4. **Account Claiming Process**:
   - When a user registers on our platform, they can claim their Goated account
   - Verification process confirms ownership of the Goated.com account
   - Upon verification, the placeholder account is merged with their platform account
   - All historical data and statistics are preserved during the merge
   - User gains ability to participate in races with their verified identity
5. **Database Implementation**:
   - `users` table stores platform accounts with custom usernames
   - Foreign key relationships link to Goated.com data (uid, name)
   - When account is claimed, a verification flag is set and records are merged
   - Relationships are updated to point to the claimed user account
   - Historical data remains intact through careful primary/foreign key management
6. **Synchronization Process Flow**:
   - Initial state: Placeholder accounts exist for all Goated.com users
   - User registration: New record in `users` table with platform-specific details
   - Account claiming: User provides verification of Goated.com ownership
   - Account merging: Data associated with placeholder is transferred to user account
   - Completed state: Single user entity with linked platform, Goated, and Telegram identities

### Telegram Integration

1. **User Verification Flow**:

   - User initiates verification through platform interface
   - Request stored in `telegramVerificationRequests` or `goatedVerificationRequests` table
   - Admin reviews request details in admin dashboard
   - Admin approves or rejects with optional notes
   - On approval:
     - User record in `users` table is updated with verification status and account details
     - The verification request record is marked as approved with timestamp
     - User receives notification of verification status
   - Admin-based verification ensures security and prevents fraudulent claims
   - All verification actions are logged for audit purposes

2. **Challenge System**:
   - Admins create challenges in the `challenges` table
   - Bot announces challenges to verified users
   - Users submit entries with proof via bot
   - Entries stored in `challengeEntries` table
   - Admins verify entries and distribute prizes
   - Bonus codes generated and provided to winners

## Planned Database Enhancements

1. **Performance Optimization**:

   - Add database indexes for frequently queried fields
   - Implement query caching for leaderboard data
   - Archive historical data to maintain performance

2. **Data Enrichment**:

   - Add user profile/demographic data tables
   - Implement engagement metrics tracking
   - Develop predictive models for user behavior

3. **Scaling Improvements**:

   - Implement database sharding for large tables
   - Create read replicas for high-traffic periods
   - Add database connection pooling

4. **Security Enhancements**:
   - Implement row-level security policies
   - Add audit logging for sensitive operations
   - Encrypt personally identifiable information (PII)

## Architecture Considerations

The database is designed with the following principles:

1. **Modularity**: Tables are organized by functional domains for clear separation of concerns
2. **Extensibility**: JSONB fields allow for flexible schema evolution without migrations
3. **Performance**: Relations are optimized for the most common query patterns
4. **Scalability**: Structure supports horizontal scaling as user base grows
5. **Data Integrity**: Foreign key constraints ensure referential integrity

This design enables the platform to maintain high performance and reliability while supporting future growth and feature expansion.

# GoatedVIPs.gg Production Deployment Guide

This document outlines the steps and best practices for deploying the GoatedVIPs.gg platform to production.

## Prerequisites

- Node.js v18+ and npm v9+
- Access to the production server or hosting platform (Vercel, Replit, etc.)
- Database credentials for production
- Domain name and SSL certificate

## Environment Setup

1. Create a production `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env.production
   ```

2. Update the `.env.production` file with actual production values:
   - Database credentials
   - JWT secrets (use strong, unique values)
   - API endpoints
   - Telegram bot tokens (if applicable)

3. **IMPORTANT**: Never commit the `.env.production` file to the repository.

## Build Process

1. Install dependencies:
   ```
   npm install
   ```

2. Build the application:
   ```
   NODE_ENV=production npm run build
   ```

   This will:
   - Build the client-side React application with Vite
   - Bundle the server-side code with esbuild
   - Output everything to the `dist` directory

3. Verify the build:
   ```
   ls -la dist
   ```

   You should see:
   - `index.js` (server entry point)
   - `public/` directory (client-side assets)

## Deployment

### Option 1: Vercel Deployment

1. Configure Vercel project settings:
   - Set the output directory to `dist`
   - Configure environment variables in the Vercel dashboard
   - Set up custom domains and SSL certificates

2. Deploy using the Vercel CLI or GitHub integration.

### Option 2: Replit Deployment

1. Configure Replit to use the production environment:
   ```
   echo "NODE_ENV=production" >> .replit
   ```

2. Set up the run command in `.replit`:
   ```
   run = "node dist/index.js"
   ```

3. Add all environment variables to the Replit Secrets panel.

### Option 3: Traditional Server Deployment

1. Transfer the `dist` directory and `package.json` to the production server.

2. Install production dependencies:
   ```
   npm install --production
   ```

3. Set up a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start dist/index.js --name goated-vips
   pm2 save
   ```

4. Configure Nginx as a reverse proxy (recommended):
   ```nginx
   server {
       listen 80;
       server_name goatedvips.gg;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. Set up SSL with Let's Encrypt:
   ```
   certbot --nginx -d goatedvips.gg
   ```

## Security Considerations

1. **HTTPS**: Ensure all traffic is served over HTTPS.

2. **Headers**: Security headers are automatically set in production mode using Helmet.

3. **Rate Limiting**: API rate limiting is configured for protection against abuse.

4. **Database**: Ensure database connection strings are secure and use SSL.

5. **Secrets**: All JWT tokens, API keys, and other secrets should be stored as environment variables.

## Monitoring and Maintenance

1. Set up health check monitoring:
   - The `/api/health` endpoint provides basic health information
   - Consider integrating with a monitoring service like Uptime Robot

2. Database backups:
   - Configure regular backups of the production database
   - Test restoration procedures periodically

3. Log management:
   - Set up centralized logging (e.g., Papertrail, Loggly)
   - Monitor for errors and unusual patterns

## Rollback Procedure

In case of deployment issues:

1. Identify the last stable version from the deployment history.

2. Redeploy the previous stable version:
   ```
   git checkout [previous-stable-tag]
   npm install
   npm run build
   ```

3. Deploy the previous build following the same deployment steps.

## Performance Optimization

1. **CDN**: Consider using a CDN for static assets.

2. **Caching**: Implement appropriate cache headers for static assets.

3. **Database**: Monitor query performance and add indexes as needed.

## Troubleshooting

Common issues and solutions:

1. **Server not starting**: Check environment variables and database connection.

2. **API errors**: Verify rate limits and database queries.

3. **Client-side errors**: Check browser console and network requests.

4. **Telegram bot issues**: Verify webhook URL and bot token.

## Contact

For deployment assistance, contact the development team at [contact information].
# GoatedVIPs.gg Platform Guide

Welcome to the GoatedVIPs.gg platform guide! This document explains how our platform works, how data flows through the system, and provides multiple deployment options to get you up and running.

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [How the Platform Works](#how-the-platform-works)
3. [Account Linking System](#account-linking-system)
4. [Telegram Bot Integration](#telegram-bot-integration)
5. [Deployment Options](#deployment-options)
   - [Replit Deployment](#replit-deployment)
   - [Vercel Deployment](#vercel-deployment)
   - [Traditional Server Deployment](#traditional-server-deployment)
   - [All-in-One Server Deployment](#all-in-one-server-deployment)
6. [Maintenance and Troubleshooting](#maintenance-and-troubleshooting)

## Platform Overview

GoatedVIPs.gg is a next-generation VIP leaderboard and rewards platform for Goated.com players who use the referral codes VIPBOOST or GOATEDVIPS. The platform serves as a reward hub and wager race leaderboard for affiliates and their players.

### Key Components

- **Frontend**: Next.js React application with Tailwind CSS for styling
- **Backend**: Express.js API server with various middleware for security and performance
- **Database**: PostgreSQL database using Drizzle ORM for data management
- **Telegram Bot**: Node.js bot for user interaction and notifications
- **Authentication**: Separate login points for public users and admins

### Core Features

- Real-time leaderboards (daily, weekly, monthly, all-time)
- Wager races & competitions with live updates
- User authentication (email/password for users, custom admin login)
- API integration with Goated.com for tracking wager data
- Three-way account linking (platform, Goated.com, Telegram)
- Admin dashboard for site management

## How the Platform Works

### Data Flow Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Goated.com │     │ GoatedVIPs  │     │   User's    │
│     API     │────▶│   Server    │────▶│   Browser   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    ▲
                          │                    │
                          ▼                    │
                    ┌─────────────┐     ┌─────────────┐
                    │  Database   │     │  Telegram   │
                    │ (PostgreSQL)│◀───▶│     Bot     │
                    └─────────────┘     └─────────────┘
```

### Data Processing Pipeline

1. **Data Collection**:
   - The server fetches wager data from the Goated.com API every 15 minutes
   - Data includes user identifiers, wager amounts, and timestamps

2. **Data Transformation**:
   - Raw API data is normalized and validated
   - Wager amounts are processed for different time periods (daily, weekly, monthly)
   - Leaderboard rankings are calculated

3. **Data Storage**:
   - Processed data is stored in the PostgreSQL database
   - Historical data is maintained for trends and analysis
   - User relationships are established through the account linking system

4. **Data Presentation**:
   - Frontend fetches data from our API endpoints
   - Real-time updates via React Query for fresh data
   - Leaderboards display user rankings and statistics
   - Wager races show current standings and prize pools

### Database Structure

The database is organized into several key tables:

- **users**: Platform user accounts
- **telegramUsers**: Telegram user information
- **wagerRaces**: Active and historical wager competitions
- **wagerRaceParticipants**: User participation in races
- **verificationRequests**: Account linking verification requests
- **affiliateStats**: Wager statistics from the Goated.com API

## Account Linking System

One of the most powerful features of GoatedVIPs.gg is the three-way account linking system that connects:

1. **Platform Accounts**: Created when users register on our website
2. **Goated.com Accounts**: External accounts with wager stats (accessed via API)
3. **Telegram Accounts**: For bot interactions and real-time notifications

### How Account Linking Works

#### Initial State: Placeholder Accounts

- All Goated.com users have placeholder accounts on our platform
- These accounts contain:
  - Goated.com UID
  - Goated.com username
  - Wager statistics from the API
- These accounts initially exist without direct user access

#### User Registration and Account Claiming

1. **User Registration**:
   - User registers on GoatedVIPs.gg with email/password
   - A new platform account is created in the `users` table

2. **Account Claiming Process**:
   - User initiates verification to claim their Goated.com account
   - User provides their Goated.com username
   - Admin verifies the ownership (manual verification for security)
   - Upon verification, the placeholder account is linked to their platform account
   - All historical data and statistics are preserved during the linking

3. **Telegram Linking** (Optional):
   - User can also link their Telegram account
   - User initiates verification through the Telegram bot
   - Admin verifies the request
   - Telegram account is linked to the platform account

### Verification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │    Admin    │     │  Database   │
│  Interface  │     │  Dashboard  │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Submit Request    │                   │
       │───────────────────┼───────────────────▶
       │                   │                   │
       │                   │ View Requests     │
       │                   │◀──────────────────┤
       │                   │                   │
       │                   │ Approve/Reject    │
       │                   │───────────────────▶
       │                   │                   │
       │ Notification      │                   │
       │◀──────────────────┼───────────────────┤
       │                   │                   │
```

### Benefits of Account Linking

- **Data Integrity**: All historical wager data is preserved
- **Security**: Admin verification prevents fraudulent claims
- **Flexibility**: Users can interact with the platform via website or Telegram
- **Unified Experience**: Single identity across all platforms

## Telegram Bot Integration

The Telegram bot provides an alternative interface to the platform, allowing users to check stats, participate in challenges, and receive notifications without visiting the website.

### Bot Setup

The bot is implemented using the `node-telegram-bot-api` library and connects to the same database as the main platform.

### Available Commands

- **/verify**: Link Telegram account to Goated.com account
- **/stats**: View personal wager statistics
- **/check_stats [username]**: Check stats for a specific username
- **/leaderboard**: View current leaderboard standings
- **/race**: Check current race position
- **/help**: Display available commands

### Verification Process via Telegram

1. User sends `/verify` command to the bot
2. Bot prompts user to provide their Goated.com username
3. User provides username
4. Bot creates a verification request in the database
5. Admin reviews and approves the request
6. Bot notifies user of successful verification
7. User can now use all bot features with their linked account

### Admin Commands

- **/verify_user [telegram_id]**: Approve a verification request
- **/list_requests**: List pending verification requests
- **/reject_user [telegram_id]**: Reject a verification request
- **/broadcast [message]**: Send message to all verified users

## Deployment Options

GoatedVIPs.gg can be deployed in several ways depending on your needs and resources. Here are the most common deployment options:

### Replit Deployment

Replit provides a simple, all-in-one hosting solution that's great for getting started quickly.

#### Setup Steps

1. **Fork the Repository**:
   - Create a Replit account if you don't have one
   - Fork the GoatedVIPs.gg repository to your Replit account

2. **Configure Environment Variables**:
   - Create a `.env` file based on `.env.example`
   - Add your database credentials, JWT secrets, and API endpoints
   - Set up Telegram bot token if using the bot

3. **Set Up Database**:
   - Create a PostgreSQL database (Replit provides this)
   - Run the database migrations: `npm run db:migrate`

4. **Configure Replit**:
   - Set the run command in `.replit`: `npm start`
   - Add environment variables to Replit Secrets panel

5. **Deploy**:
   - Click "Run" to start your application
   - Replit will provide a URL for your application

#### Advantages

- Simple setup process
- All-in-one solution (frontend, backend, database)
- Free tier available for testing
- Automatic HTTPS

#### Limitations

- Limited resources on free tier
- May experience cold starts
- Less control over infrastructure

### Vercel Deployment

Vercel is ideal for deploying the frontend, with options for handling the backend.

#### Frontend Deployment

1. **Prepare Your Project**:
   - Ensure your project has a proper `package.json` with build scripts
   - Configure `next.config.js` for production settings

2. **Connect to Vercel**:
   - Create a Vercel account
   - Import your GitHub repository
   - Configure build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist/public`

3. **Environment Variables**:
   - Add all required environment variables in Vercel dashboard
   - Set `NODE_ENV=production`

4. **Deploy**:
   - Trigger deployment from Vercel dashboard
   - Vercel will build and deploy your frontend

#### Backend Options

**Option 1: Vercel Serverless Functions**

1. Create API routes in `/api` directory
2. Configure `vercel.json` to handle API routes
3. Deploy alongside frontend

**Option 2: Separate Backend**

1. Deploy backend separately on a service like Heroku, Railway, or DigitalOcean
2. Configure CORS to allow requests from Vercel frontend
3. Update frontend API endpoints to point to backend URL

#### Database Setup

1. Use a managed PostgreSQL service (Neon, Supabase, etc.)
2. Configure connection string in environment variables
3. Run migrations on the database

#### Advantages

- Excellent for frontend performance
- Automatic CI/CD from GitHub
- Free tier available
- Global CDN

#### Limitations

- Serverless functions have execution limits
- Separate backend may require additional configuration

### Traditional Server Deployment

For more control and performance, deploying to a VPS (Virtual Private Server) is a good option.

#### Server Setup

1. **Provision a Server**:
   - Choose a provider (DigitalOcean, AWS, Linode, etc.)
   - Select an appropriate plan (2GB RAM minimum recommended)
   - Choose Ubuntu 20.04 or later

2. **Install Dependencies**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm nginx postgresql
   sudo npm install -g pm2
   ```

3. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/GoatedVipsgg.git
   cd GoatedVipsgg
   npm install
   ```

4. **Configure Environment**:
   - Create `.env` file with production values
   - Set up PostgreSQL database
   - Run migrations: `npm run db:migrate`

5. **Build Application**:
   ```bash
   NODE_ENV=production npm run build
   ```

#### Nginx Configuration

Create a new Nginx configuration file:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Process Management with PM2

```bash
pm2 start dist/index.js --name goated-vips
pm2 save
pm2 startup
```

#### SSL Setup

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Advantages

- Full control over server resources
- Better performance for high-traffic sites
- No cold starts or execution limits
- Ability to run background processes

#### Limitations

- More complex setup
- Requires server management knowledge
- Higher cost than serverless options

### All-in-One Server Deployment

This approach runs both frontend and backend on a single server for simplicity.

#### Setup Steps

1. Follow the Traditional Server Deployment steps above
2. Configure the application to serve the frontend from the backend:
   - In `server/index.ts`, ensure the static file serving is enabled
   - Build the frontend to be served by the backend

3. **Single Command Startup**:
   ```bash
   pm2 start dist/index.js --name goated-vips
   ```

4. **Domain Configuration**:
   - Point your domain to your server IP
   - Configure Nginx as shown in the Traditional Deployment section
   - Set up SSL with Let's Encrypt

#### Advantages

- Simplified deployment process
- Single codebase to manage
- Reduced infrastructure costs
- Easier debugging (everything in one place)

#### Limitations

- Less scalability for high-traffic sites
- Single point of failure
- Frontend and backend scaling tied together

## Maintenance and Troubleshooting

### Regular Maintenance Tasks

1. **Database Backups**:
   ```bash
   # Create a backup
   pg_dump -U username -d database_name > backup_$(date +%Y%m%d).sql
   
   # Schedule daily backups with cron
   0 0 * * * pg_dump -U username -d database_name > /path/to/backups/backup_$(date +%Y%m%d).sql
   ```

2. **Log Rotation**:
   - Configure log rotation to prevent disk space issues
   - Use logrotate or PM2's built-in log rotation

3. **Updates and Security Patches**:
   ```bash
   # Update dependencies
   npm audit fix
   
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   ```

4. **Performance Monitoring**:
   - Use PM2 monitoring: `pm2 monit`
   - Consider adding application monitoring (New Relic, Datadog, etc.)

### Common Issues and Solutions

#### Database Connection Issues

**Symptoms**: Server fails to start, database connection errors in logs

**Solutions**:
1. Check database credentials in `.env` file
2. Verify PostgreSQL is running: `sudo systemctl status postgresql`
3. Check network connectivity to database
4. Verify database user permissions

#### API Rate Limiting

**Symptoms**: Users receive 429 Too Many Requests errors

**Solutions**:
1. Adjust rate limits in `server/middleware/rate-limiter.ts`
2. Implement caching for frequently accessed data
3. Add retry logic with exponential backoff in frontend

#### Telegram Bot Issues

**Symptoms**: Bot not responding, verification not working

**Solutions**:
1. Check `TELEGRAM_BOT_TOKEN` in environment variables
2. Verify webhook URL is correct and accessible
3. Restart the bot: `pm2 restart goated-vips`
4. Check Telegram API status

#### Memory Issues

**Symptoms**: Application crashes, out of memory errors

**Solutions**:
1. Increase server resources
2. Optimize database queries
3. Implement proper pagination for large data sets
4. Add memory limits to PM2: `pm2 start dist/index.js --max-memory-restart 1G`

### Health Monitoring

The application includes a built-in health check endpoint at `/api/health` that provides:
- Database connection status
- API service status
- Environment information
- Uptime statistics

Use this endpoint with monitoring services like Uptime Robot or Pingdom to get alerts when the service is down.

### Scaling Considerations

As your user base grows, consider these scaling options:

1. **Vertical Scaling**:
   - Increase server resources (CPU, RAM)
   - Optimize database with proper indexes

2. **Horizontal Scaling**:
   - Split frontend and backend to separate servers
   - Use load balancer for multiple backend instances
   - Implement Redis for session storage and caching

3. **Database Scaling**:
   - Use connection pooling
   - Consider read replicas for heavy read operations
   - Implement database sharding for very large datasets
