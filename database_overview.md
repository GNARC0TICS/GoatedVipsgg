# Database Schema Overview - GoatedVIPs Affiliate Platform

## Introduction
This document provides a comprehensive overview of the database schema for our affiliate marketing platform. The platform integrates with Telegram for user interaction and Goated.com for affiliate tracking and rewards.

## Core Components

### 1. User Management System
#### users
```
Table Structure:
├── Basic Info
│   ├── id (PK)
│   ├── username (unique)
│   ├── email (unique)
│   └── password
├── Status & Permissions
│   └── isAdmin
├── Security & Tracking
│   ├── emailVerified
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
- One-to-One: telegramUsers
- One-to-One: verificationRequests
- One-to-Many: verificationHistory
- One-to-Many: createdRaces
- One-to-Many: raceParticipations
```

### 2. Telegram Integration System
#### telegramUsers
```
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
```

#### verificationRequests
```
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
    └── uniqueRequest (unique constraint)
```

#### verificationHistory
```
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
```

### 3. Wager Racing System
#### wagerRaces
```
Table Structure:
├── Race Info
│   ├── id (PK)
│   ├── title
│   ├── type
│   └── status
├── Prize Structure
│   ├── prizePool
│   └── prizeDistribution (jsonb)
├── Requirements
│   └── minWager
├── Timing
│   ├── startDate
│   └── endDate
└── Additional Info
    ├── rules
    └── description
```

#### wagerRaceParticipants
```
Table Structure:
├── Participation
│   ├── id (PK)
│   ├── raceId (FK -> wagerRaces)
│   └── userId (FK -> users)
├── Performance
│   ├── totalWager
│   └── rank
└── Tracking
    ├── joinedAt
    ├── updatedAt
    └── wagerHistory (jsonb)
```

### 4. Challenge System
#### challenges
```
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
    └── createdBy
```

#### challengeEntries
```
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
```

### 5. Additional Features
#### affiliateStats
```
Table Structure:
├── Performance Metrics
│   ├── id (PK)
│   ├── userId (FK -> users)
│   ├── totalWager
│   └── commission
└── Timing
    └── timestamp
```

#### bonusCodes
```
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
```

#### notificationPreferences
```
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
    └── pushNotifications
```

## Key Workflows

### 1. User Verification Process
1. User registration in platform (users)
2. Telegram account linking (telegramUsers)
3. Verification request submission (verificationRequests)
4. Admin verification via Telegram bot
5. Verification history logging (verificationHistory)

### 2. Race and Challenge Management
1. Admin race/challenge creation
2. User participation through Telegram
3. Performance tracking
4. Automated prize distribution

### 3. Affiliate System
1. Wager tracking
2. Commission calculation
3. Bonus code management
4. Real-time statistics

## Data Integrity Features
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate records
- Default values ensure data consistency
- Timestamps track all changes
- JSON fields for flexible data storage
- Audit trails for important operations

## Security Considerations
- Passwords are hashed
- IP tracking for security
- Admin actions are logged
- Verification process is tracked
- Rate limiting implemented
- Session management

## Maintenance Notes
- Regular backups recommended
- Monitor jsonb field sizes
- Index heavy-query columns
- Archive old verification history
- Monitor race/challenge completion
