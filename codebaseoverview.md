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
│   ├── index.ts            # Database connection setup
│   └── schema.ts           # Main schema file with exports
├── server                  # Backend server
│   ├── telegram            # Telegram bot implementation
│   │   ├── commands        # Bot command modules
│   │   ├── utils           # Bot utility functions
│   │   └── bot.ts          # Main bot implementation
│   ├── config              # Server configuration
│   ├── middleware          # Express middleware
│   ├── routes.ts           # API routes definition
│   └── index.ts            # Server entry point
└── config files            # Various configuration files
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
