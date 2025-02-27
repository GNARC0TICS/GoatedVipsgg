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
Stores core user information for authentication and identification.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| username | text | Unique username |
| password | text | Hashed password |
| email | text | Unique email |
| isAdmin | boolean | Admin status flag |
| createdAt | timestamp | Account creation date |
| lastLogin | timestamp | Last login timestamp |

#### `notificationPreferences` Table
Controls user notification settings across different channels.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| wagerRaceUpdates | boolean | Wager race notifications |
| vipStatusChanges | boolean | VIP status notifications |
| promotionalOffers | boolean | Marketing notifications |
| monthlyStatements | boolean | Monthly report notifications |
| emailNotifications | boolean | Email channel enabled |
| pushNotifications | boolean | Push channel enabled |
| updatedAt | timestamp | Last updated timestamp |

### Affiliate Marketing System

#### `affiliateStats` Table
Tracks affiliate marketing performance metrics.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| totalWager | decimal | Total wager amount |
| commission | decimal | Commission earned |
| timestamp | timestamp | Recording timestamp |

### Wager Race Competition System

#### `wagerRaces` Table
Defines wager race competitions with timeframes and prize pools.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| title | text | Race title |
| type | text | Race type (weekly/monthly/weekend) |
| status | text | Race status (upcoming/live/completed) |
| prizePool | decimal | Total prize amount |
| startDate | timestamp | Competition start date |
| endDate | timestamp | Competition end date |
| minWager | decimal | Minimum wager to qualify |
| prizeDistribution | jsonb | Prize distribution structure |
| createdBy | integer | Admin who created the race |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |
| rules | text | Race rules |
| description | text | Race description |

#### `wagerRaceParticipants` Table
Tracks user participation in wager races.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| race_id | integer | Foreign key to wagerRaces |
| user_id | integer | Foreign key to users |
| total_wager | decimal | User's total wager in race |
| rank | integer | Final rank in competition |
| joined_at | timestamp | Join timestamp |
| updated_at | timestamp | Last update timestamp |
| wager_history | jsonb | Historical wager progression |

#### `historicalRaces` Table
Archives completed wager races for historical reference.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| month | integer | Month number |
| year | integer | Year number |
| prizePool | decimal | Total prize pool |
| startDate | timestamp | Start date |
| endDate | timestamp | End date |
| participants | jsonb | Participant data snapshot |
| totalWagered | decimal | Total amount wagered |
| participantCount | integer | Number of participants |
| status | text | Race status (completed) |
| createdAt | timestamp | Creation timestamp |
| metadata | jsonb | Additional metadata |

### Telegram Bot Integration

#### `telegramUsers` Table
Links Telegram users to platform accounts.

| Field | Type | Description |
|-------|------|-------------|
| telegramId | text | Primary key (Telegram ID) |
| telegramUsername | text | Telegram username |
| goatedUsername | text | Platform username |
| isVerified | boolean | Verification status |
| createdAt | timestamp | Record creation timestamp |
| lastActive | timestamp | Last activity timestamp |
| notificationsEnabled | boolean | Notification preferences |
| verifiedAt | timestamp | Verification timestamp |
| verifiedBy | text | Admin who verified |
| updatedAt | timestamp | Last update timestamp |

#### `verificationRequests` Table
Manages Telegram account verification process.

| Field | Type | Description |
|-------|------|-------------|
| telegramId | text | Primary key (Telegram ID) |
| goatedUsername | text | Platform username to verify |
| requestedAt | timestamp | Request timestamp |
| status | text | Request status |
| adminNotes | text | Admin notes |
| telegramUsername | text | Telegram username |
| verifiedAt | timestamp | Verification timestamp |
| verifiedBy | text | Admin who verified |
| updatedAt | timestamp | Last update timestamp |

#### `challenges` Table
Defines gamified challenges distributed via Telegram.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| game | text | Game type |
| multiplier | text | Required multiplier |
| minBet | text | Minimum bet amount |
| prizeAmount | text | Prize amount |
| maxWinners | integer | Maximum winner count |
| timeframe | text | Challenge duration |
| description | text | Challenge description |
| status | text | Challenge status |
| createdAt | timestamp | Creation timestamp |
| createdBy | text | Admin who created |
| updatedAt | timestamp | Last update timestamp |

#### `challengeEntries` Table
Tracks user submissions for challenges.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| challengeId | integer | Foreign key to challenges |
| telegramId | text | Participant's Telegram ID |
| betLink | text | Proof of bet link |
| status | text | Entry status |
| bonusCode | text | Bonus code provided |
| submittedAt | timestamp | Submission timestamp |
| verifiedAt | timestamp | Verification timestamp |
| verifiedBy | text | Admin who verified |
| updatedAt | timestamp | Last update timestamp |

### Support System

#### `supportTickets` Table
Customer support ticketing system.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| subject | text | Ticket subject |
| description | text | Issue description |
| status | text | Ticket status |
| priority | text | Priority level |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |
| assignedTo | integer | Staff assigned to ticket |

#### `ticketMessages` Table
Messages within support tickets.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| ticketId | integer | Foreign key to supportTickets |
| userId | integer | Message sender |
| message | text | Message content |
| createdAt | timestamp | Creation timestamp |
| isStaffReply | boolean | Staff message flag |

### Marketing Tools

#### `bonusCodes` Table
Promotional bonus codes for marketing campaigns.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| code | text | Unique bonus code |
| description | text | Code description |
| value | text | Bonus value |
| expiresAt | timestamp | Expiration date |
| createdAt | timestamp | Creation timestamp |
| expired | boolean | Expired status |
| createdBy | integer | Admin who created |

#### `newsletterSubscriptions` Table
Email newsletter subscription management.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| email | text | Subscriber email |
| isSubscribed | boolean | Active subscription status |
| subscribedAt | timestamp | Subscribe timestamp |
| unsubscribedAt | timestamp | Unsubscribe timestamp |
| source | text | Subscription source |

## Key Relationships

1. **User-centric Relationships**:
   - A user has one notification preference profile
   - A user can participate in multiple wager races
   - A user can create multiple wager races (as admin)
   - A user can have multiple affiliate statistics entries
   - A user can create and be assigned to support tickets

2. **Wager Race Relationships**:
   - A wager race has one creator (admin user)
   - A wager race has many participants
   - Completed wager races are archived in historical races

3. **Telegram Integration**:
   - A Telegram user can be linked to one platform account
   - A Telegram user can participate in multiple challenges
   - A challenge can have multiple entries from different users

## Data Flow and Transformation

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

### Telegram Integration

1. **User Verification Flow**:
   - User initiates verification through Telegram bot
   - Request stored in `verificationRequests` table
   - Admin reviews and approves/rejects
   - On approval, record created in `telegramUsers` table
   - User receives notification of verification status

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