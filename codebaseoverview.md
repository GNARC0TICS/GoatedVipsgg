
# GoatedVIPs.gg Platform - Codebase Overview

## Project Structure

```
GoatedVIPs.gg/
├── client/                       # Frontend React application
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── ui/               # Base UI components (shadcn/ui)
│   │   │   ├── Layout.tsx        # Main layout wrapper
│   │   │   ├── LeaderboardTable.tsx # Leaderboard display component
│   │   │   ├── MobileAdminBadge.tsx # Admin indicator for mobile
│   │   │   ├── PageTransition.tsx # Animation wrapper
│   │   │   └── QuickProfile.tsx  # User profile popup
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── use-auth.tsx      # Authentication hook
│   │   │   ├── use-leaderboard.tsx # Leaderboard data fetching
│   │   │   └── use-wager-races.tsx # Wager race data management
│   │   ├── lib/                  # Utility functions and helpers
│   │   │   ├── api.ts            # API client functions
│   │   │   ├── tier-utils.ts     # User tier calculations
│   │   │   ├── types.d.ts        # TypeScript type definitions
│   │   │   └── utils.ts          # General utility functions
│   │   ├── pages/                # Application pages
│   │   │   ├── admin/            # Admin dashboard and management pages
│   │   │   │   ├── Dashboard.tsx # Admin overview page
│   │   │   │   ├── UserManagement.tsx # User admin controls
│   │   │   │   ├── WagerRaceManagement.tsx # Race configuration
│   │   │   │   ├── NotificationManagement.tsx # Notification controls 
│   │   │   │   ├── BonusCodeManagement.tsx # Bonus code admin
│   │   │   │   └── SupportManagement.tsx # Support ticket management
│   │   │   ├── Home.tsx          # Landing page
│   │   │   ├── Leaderboard.tsx   # Main leaderboard page
│   │   │   ├── WagerRaces.tsx    # Wager race display and tracking
│   │   │   ├── UserProfile.tsx   # User profile page
│   │   │   ├── Telegram.tsx      # Telegram integration page
│   │   │   ├── Challenges.tsx    # User challenges page
│   │   │   ├── GoatedToken.tsx   # Token information page
│   │   │   ├── VipProgram.tsx    # VIP program details
│   │   │   ├── HowItWorks.tsx    # Platform explanation
│   │   │   └── Support.tsx       # User support interface
│   │   ├── App.tsx               # Main application component
│   │   └── index.tsx             # Application entry point
│   ├── index.html                # HTML entry point
│   └── tailwind.config.ts        # Tailwind CSS configuration
│
├── server/                       # Backend Express server
│   ├── config/                   # Server configuration
│   │   └── db.ts                 # Database configuration
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # Authentication middleware
│   │   ├── rate-limiter.ts       # API rate limiting
│   │   └── validation.ts         # Request validation
│   ├── telegram/                 # Telegram bot integration
│   │   ├── bot.ts                # Main bot initialization
│   │   ├── commands.ts           # Bot command handlers
│   │   └── verification.ts       # User verification logic
│   ├── index.ts                  # Server entry point
│   ├── routes.ts                 # API route definitions
│   ├── auth.ts                   # Authentication logic
│   └── verification-routes.ts    # User verification endpoints
│
├── db/                           # Database layer
│   ├── schema/                   # Database schema definitions
│   │   ├── users.ts              # User table schema
│   │   ├── wager-races.ts        # Wager race table schema
│   │   └── challenges.ts         # Challenges table schema
│   ├── index.ts                  # Database connection initialization
│   ├── schema.ts                 # Combined schema exports
│   └── types.d.ts                # TypeScript types for DB entities
│
├── fonts/                        # Custom web fonts
│   ├── GeistMono-Black.woff2     # Monospace font
│   ├── GeistMono-Regular.woff2   # Monospace font
│   ├── MonaSansCondensed-ExtraBold.woff2 # Heading font
│   └── MonaSansExpanded-ExtraBold.woff2  # Expanded heading font
│
├── package.json                  # Project dependencies and scripts
├── databaseoverview.md           # Database documentation
├── drizzle.config.ts             # Drizzle ORM configuration
├── tailwind.config.ts            # Global Tailwind configuration
├── theme.json                    # UI theme configuration
├── tsconfig.json                 # TypeScript configuration
└── vite.config.ts                # Vite bundler configuration
```

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with custom theme
- **UI Components**: Radix UI primitives with shadcn/ui
- **Animation**: Framer Motion
- **State Management**: React Query for server state
- **Routing**: React Router

### Backend
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle
- **Authentication**: JWT with Passport.js
- **External Integrations**: Telegram Bot API
- **Security**: Rate limiting with rate-limiter-flexible

### Database
- **Type**: PostgreSQL
- **Schema Management**: Drizzle ORM with migrations
- **Data Types**: Strongly typed with TypeScript

## Key Application Flows

### User Authentication
1. User signs up/logs in via web UI or Telegram
2. JWT tokens manage session state
3. Protected routes enforce authentication

### Leaderboard Display
1. Data fetched from backend API 
2. Filtered by time period (daily/weekly/monthly/all-time)
3. Cached for performance
4. Real-time updates via WebSockets

### Wager Races
1. Admins configure race parameters
2. Users automatically participate when wagering
3. Live leaderboard shows current standings
4. Race results processed automatically at end time

### Admin Dashboard
1. Centralized management interface
2. User management capabilities
3. Race configuration and management
4. Notification and bonus code administration

### Telegram Integration
1. Bot provides platform interaction via Telegram
2. User verification links accounts
3. Real-time notifications and commands
4. Community engagement features

## Development Patterns

### Component Structure
- UI components use shadcn/ui pattern with Radix primitives
- Page components integrate with data hooks
- Layout components handle consistent structure

### Data Fetching
- React Query handles server state
- Custom hooks abstract data fetching logic
- Type-safe API interactions

### Styling Approach
- Utility-first with Tailwind CSS
- Consistent color scheme via theme.json
- Responsive design with mobile-first approach

### Authentication Pattern
- JWT tokens stored in HTTP-only cookies
- Role-based access control
- Secure routes with middleware protection
