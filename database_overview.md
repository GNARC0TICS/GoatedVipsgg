# Database Schema Overview - GoatedVIPs Affiliate Platform

## Introduction
This document provides a comprehensive overview of the database schema for our affiliate marketing platform. The platform integrates with Telegram for user interaction and Goated.com for affiliate tracking and rewards.

## Core Components

### 1. User Management System
#### users
```sql
Table Structure:
├── Basic Info
│   ├── id (PK)
│   ├── username (unique)
│   ├── email (unique)
│   └── password
├── Status & Permissions
│   ├── isAdmin
│   └── emailVerified
├── Security & Tracking
│   ├── emailVerificationToken
│   ├── lastLoginIp
│   ├── registrationIp
│   ├── ipHistory (jsonb)
│   └── loginHistory (jsonb)
├── Location Data
│   ├── country
│   └── city
└── Activity & Integration
    ├── lastActive
    ├── telegramId
    ├── telegramVerified
    ├── telegramVerifiedAt
    ├── goatedUsername
    └── goatedVerified

Relationships:
- One-to-One: notificationPreferences
- One-to-One: telegramUser
- One-to-One: verificationRequest
- One-to-Many: verificationHistory
- One-to-Many: createdRaces
- One-to-Many: raceParticipations
- One-to-Many: supportTickets
```

### 2. Support System
#### supportTickets
```sql
Table Structure:
├── Ticket Info
│   ├── id (PK)
│   ├── userId (FK -> users)
│   ├── subject
│   └── description
├── Status
│   ├── status (open/closed)
│   └── priority (low/medium/high)
└── Management
    ├── assignedTo (FK -> users)
    ├── createdAt
    └── updatedAt

Relationships:
- Many-to-One: user
- One-to-Many: messages
- One-to-One: assignedStaff
```

#### ticketMessages
```sql
Table Structure:
├── Message Info
│   ├── id (PK)
│   ├── ticketId (FK -> supportTickets)
│   ├── userId (FK -> users)
│   └── message
├── Metadata
│   ├── isStaffReply
│   └── createdAt

Relationships:
- Many-to-One: ticket
- Many-to-One: user
```

### 3. Telegram Integration System
#### telegramUsers
```sql
Table Structure:
├── Core Details
│   ├── id (PK)
│   ├── telegramId (unique)
│   └── telegramUsername
├── Relationships
│   └── userId (FK -> users)
├── Verification
│   ├── isVerified
│   ├── verifiedAt
│   └── verifiedBy
└── Settings
    ├── notificationsEnabled
    └── updatedAt

Relationships:
- One-to-One: user
```

#### verificationRequests
```sql
Table Structure:
├── Request Details
│   ├── id (PK)
│   ├── telegramId
│   └── userId (FK -> users)
├── Status Info
│   ├── status
│   ├── requestedAt
│   ├── verifiedAt
│   └── verifiedBy
├── User Data
│   ├── telegramUsername
│   └── goatedUsername
└── Admin
    ├── adminNotes
    ├── updatedAt
    └── uniqueRequest (unique)

Relationships:
- Many-to-One: user
```

#### verificationHistory
```sql
Table Structure:
├── History Details
│   ├── id (PK)
│   ├── telegramId
│   └── userId (FK -> users)
├── Verification Info
│   ├── status
│   ├── goatedUsername
│   └── verifiedBy
└── Audit Trail
    ├── verifiedAt
    ├── adminNotes
    └── createdAt

Relationships:
- Many-to-One: user
```

### 4. Wager Racing System
#### wagerRaces
```sql
Table Structure:
├── Race Info
│   ├── id (PK)
│   ├── title
│   ├── type
│   └── status
├── Prize Structure
│   ├── prizePool (decimal)
│   └── prizeDistribution (jsonb)
├── Requirements
│   └── minWager (decimal)
├── Timing
│   ├── startDate
│   └── endDate
└── Additional Info
    ├── rules
    ├── description
    ├── createdBy (FK -> users)
    ├── createdAt
    └── updatedAt

Relationships:
- Many-to-One: creator
- One-to-Many: participants
```

#### wagerRaceParticipants
```sql
Table Structure:
├── Participation
│   ├── id (PK)
│   ├── raceId (FK -> wagerRaces)
│   └── userId (FK -> users)
├── Performance
│   ├── totalWager (decimal)
│   └── rank
└── Tracking
    ├── joinedAt
    ├── updatedAt
    └── wagerHistory (jsonb)

Relationships:
- Many-to-One: race
- Many-to-One: user
```

### 5. Challenge System
#### challenges
```sql
Table Structure:
├── Game Details
│   ├── id (PK)
│   ├── game
│   ├── multiplier
│   └── minBet
├── Rewards
│   ├── prizeAmount
│   └── maxWinners
└── Management
    ├── timeframe
    ├── description
    ├── status
    ├── createdBy
    ├── createdAt
    └── updatedAt

Relationships:
- One-to-Many: entries
```

#### challengeEntries
```sql
Table Structure:
├── Entry Info
│   ├── id (PK)
│   ├── challengeId (FK -> challenges)
│   └── telegramId
├── Verification
│   ├── betLink
│   ├── status
│   └── bonusCode
└── Tracking
    ├── submittedAt
    ├── verifiedAt
    └── verifiedBy

Relationships:
- Many-to-One: challenge
```

### 6. Additional Features
#### bonusCodes
```sql
Table Structure:
├── Code Details
│   ├── id (PK)
│   ├── code (unique)
│   ├── description
│   └── value
├── Status
│   └── expired
└── Tracking
    ├── expiresAt
    ├── createdAt
    ├── createdBy (FK -> users)
    ├── userId (FK -> users)
    └── claimedAt

Relationships:
- Many-to-One: creator
- Many-to-One: claimant
```

#### notificationPreferences
```sql
Table Structure:
├── User Settings
│   ├── id (PK)
│   └── userId (FK -> users)
├── Notification Types
│   ├── wagerRaceUpdates
│   ├── vipStatusChanges
│   ├── promotionalOffers
│   └── monthlyStatements
└── Delivery Methods
    ├── emailNotifications
    ├── pushNotifications
    └── updatedAt

Relationships:
- One-to-One: user
```

## Schema Changes and Migrations
1. The verification system now maintains a history of all verification attempts
2. Support system has been added with ticket management
3. Race tracking system has been enhanced with participant history
4. Challenge system has been implemented for game-specific competitions

## Security Features
- All sensitive fields use appropriate data types
- Foreign key constraints ensure referential integrity
- Timestamps track all changes
- Audit trails for important operations
- IP tracking and history for security
- Admin actions are logged

## Maintenance Notes
- Regular backups recommended
- Monitor jsonb field sizes
- Index heavy-query columns
- Archive old verification history
- Monitor race/challenge completion