# Project Table of Contents

This document provides a comprehensive overview of the codebase structure for the Affiliate Marketing Platform. The project leverages TypeScript, React, Express, PostgreSQL with Drizzle ORM, and Telegram bot integration for a sophisticated marketing system.

## Root Directory

- **affiliate_stats.json**: Contains statistical data related to affiliate performance metrics.
- **package.json**: Project configuration, dependencies, and scripts.
- **package-lock.json**: Exact versions of installed dependencies.
- **tsconfig.json**: TypeScript configuration for the project.
- **tailwind.config.ts**: Tailwind CSS configuration for styling.
- **postcss.config.js**: PostCSS configuration for CSS processing.
- **theme.json**: Theme configuration for the application's visual appearance.
- **vite.config.ts**: Vite bundler configuration for the frontend.
- **drizzle.config.ts**: Configuration for Drizzle ORM database operations.
- **code-to-text-*.txt**: Generated code documentation files.
- **databaseoverview.md**: Documentation of the database schema and relationships.
- **replit.nix**: Replit-specific system configuration.

## Client Directory

The client directory contains all frontend code for the web application.

### client/src

- **main.tsx**: Entry point for the React application.
- **App.tsx**: Main application component.
- **Routes.tsx**: Application routing configuration.
- **index.css**: Global CSS styles.
- **vite-env.d.ts**: TypeScript declarations for Vite environment.

### client/src/components

UI components used throughout the application:

- **AffiliateStats.tsx**: Component for displaying affiliate performance statistics.
- **AnimateOnScroll.tsx**: Component for scroll-based animations.
- **AuthButton.tsx & AuthModal.tsx**: Authentication-related components.
- **BonusCodeHeroCard.tsx**: Component for displaying bonus code promotions.
- **CountdownTimer.tsx**: Timer component for tracking time-limited events.
- **FeatureCarousel.tsx**: Carousel for showcasing platform features.
- **FirebaseAuth.tsx**: Firebase authentication integration.
- **FloatingSupport.tsx**: Floating support chat/help component.
- **Layout.tsx**: Main layout wrapper component.
- **LeaderboardTable.tsx**: Component for displaying user rankings.
- **LoadingSpinner.tsx**: Loading indicator component.
- **MVPCards.tsx & mvp-card.tsx**: Components for displaying important users or features.
- **MobileAdminBadge.tsx**: Mobile-specific admin user identification.
- **PageTransition.tsx**: Transition effects between pages.
- **PreLoader.tsx**: Initial loading screen component.
- **ProtectedRoute.tsx**: Route protection for authenticated users.
- **QuickProfile.tsx**: User profile summary component.
- **RaceTimer.tsx**: Timer for competition/race events.
- **ScrollToTop.tsx**: Utility to scroll to top of page.
- **SlotFix.tsx**: Component for fixing slot-related issues.
- **SocialShare.tsx**: Social media sharing functionality.
- **theme-toggle.tsx**: Theme switching component.
- **check-routes.ts**: Utility for route verification.
- **kokonutui/**: UI components from Kokonut UI library.
- **ui/**: UI components from ShadCN UI library.
- **chat/**: Chat-related components.

### client/src/contexts

React context providers:

- **AuthContext.tsx**: Authentication state context provider.

### client/src/hooks

Custom React hooks:

- **use-intersection-observer.tsx**: Hook for detecting element visibility.
- **use-leaderboard.ts**: Hook for fetching leaderboard data.
- **use-mobile.tsx**: Hook for detecting mobile devices.
- **use-toast.ts & use-toast.tsx**: Hooks for displaying toast notifications.
- **use-user.ts & use-user.tsx**: Hooks for user data and operations.

### client/src/lib

Utility libraries and helper functions:

- **auth.tsx**: Authentication utility functions.
- **firebase.ts**: Firebase configuration and functions.
- **navigation.ts**: Navigation utilities.
- **queryClient.ts**: React Query client configuration.
- **tier-utils.ts**: Utilities for handling user tiers/levels.
- **toast-context.tsx**: Context for toast notifications.
- **types.d.ts**: TypeScript type definitions.
- **utils.ts**: General utility functions.

### client/src/pages

Application pages/routes:

- **Home.tsx**: Homepage component.
- **Dashboard.tsx**: User dashboard page.
- **BonusCodes.tsx & bonus-codes.tsx**: Bonus codes management pages.
- **Challenges.tsx**: Challenges/competitions page.
- **GoatedToken.tsx**: Token-related page.
- **Help.tsx**: Help/support page.
- **HowItWorks.tsx**: Platform explanation page.
- **Leaderboard.tsx**: User rankings page.
- **PrivacyPage.tsx & TermsPage.tsx**: Legal pages.
- **Promotions.tsx**: Marketing promotions page.
- **ProvablyFair.tsx**: Fairness verification page.
- **Telegram.tsx**: Telegram integration page.
- **UserProfile.tsx**: User profile page.
- **VipProgram.tsx & VipTransfer.tsx**: VIP program related pages.
- **WagerRaces.tsx**: Competition races page.
- **admin/*.tsx & admin.tsx & admin-login.tsx**: Admin-related pages.
- **auth-page.tsx**: Authentication page.
- **faq.tsx**: Frequently asked questions page.
- **not-found.tsx**: 404 error page.
- **notification-preferences.tsx**: User notification settings.
- **support.tsx**: Support/contact page.
- **tips-and-strategies.tsx**: User guidance page.

### client/src/styles

Styling files:

- **fonts.css**: Font definitions and imports.
- **theme.css**: Theme-specific styles.

## Server Directory

Server-side code for the application:

- **index.ts**: Entry point for the Express server.
- **routes.ts**: API route definitions.
- **auth.ts**: Authentication server logic.
- **vite.ts**: Vite server integration.
- **test-api.ts**: API testing utilities.
- **basic-verification-routes.ts & verification-routes.ts**: Routes for user verification.
- **db-reset.ts**: Database reset utility script.

### server/config

Server configuration files:

- **api.ts**: API configuration settings.
- **auth.ts**: Authentication configuration.

### server/middleware

Express middleware components:

- **admin.ts**: Admin access middleware.
- **auth.ts**: Authentication middleware.
- **rate-limiter.ts**: Rate limiting middleware to prevent abuse.

### server/telegram

Telegram bot integration:

- **bot.ts**: Telegram bot implementation.
- **BOTWELCOME.png**: Welcome image for the bot.
- **README.md**: Documentation for the Telegram bot.

## Database (db) Directory

Database-related code:

- **index.ts**: Database connection and initialization.
- **types.d.ts**: TypeScript type definitions for database entities.
- **schema.ts**: Primary schema definitions file.

### db/schema

Database schema definitions:

- **users.ts**: User entity schema.
- **telegram.ts**: Telegram-related entity schema.

## Additional Directories

- **attached_assets/**: Various images, screenshots, and design files.
- **dist/**: Compiled production code.
- **fonts/**: Custom font files.
- **lib/**: Shared utility functions.
- **ui-enhancement-package/**: UI enhancement components and assets.

## Development Workflow

The project uses a workflow named 'Start application' which runs `npm run dev` to start both frontend and backend servers during development.

## Key Technologies Used

1. **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
2. **Backend**: Express, Node.js
3. **Database**: PostgreSQL with Drizzle ORM
4. **Authentication**: Firebase Auth, Passport
5. **External Services**: Telegram Bot API, OpenAI API
6. **State Management**: React Context, React Query
7. **UI Libraries**: ShadCN UI, Kokonut UI, Radix UI
8. **Routing**: wouter (frontend), Express (backend)