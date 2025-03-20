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
