# Technical Context

## API Integration

### Goated.com API
- **Authentication**: JWT Bearer token (GOATED_TOKEN)
- **Refresh Rate**: 15-minute intervals
- **Endpoints**:
  - `/user2/affiliate/referral-leaderboard/2RW440E`
  - `/health`
- **Data Flow**: API → Cache → Database → Frontend

### Caching Strategy
- **Duration**: 15 minutes
- **Implementation**: In-memory with database fallback
- **Scope**: Leaderboard data and race statistics
- **Invalidation**: Automatic on update or manual trigger

### Database Architecture
- **ORM**: Drizzle
- **Tables**:
  - affiliate_stats
  - wager_races
  - wager_race_participants
- **Batch Processing**: 50 entries per operation
- **Indexing**: Optimized for frequent queries

## Performance Optimizations

### API Load Reduction
- Synchronized 15-minute cache across components
- Database fallback for API outages
- Batch processing for database operations

### Error Handling
- Graceful degradation to database
- No synthetic data generation
- Clear error logging and monitoring

### Database Efficiency
- Strategic indexing
- Connection pooling
- Query optimization

## Development Setup

### Environment Variables
```env
GOATED_TOKEN=jwt_token_here
DATABASE_URL=postgresql://...
```

### Key Dependencies
- Node.js/TypeScript
- PostgreSQL
- Drizzle ORM
- React (Frontend)

### Development Tools
- VSCode
- PostgreSQL
- Git

## Technologies Used

- **Frontend**: React with TypeScript, utilizing Tailwind CSS for styling and Shadcn UI components for a consistent design system.
- **Backend**: Express.js server written in TypeScript, handling API requests, authentication, and business logic.
- **Database**: PostgreSQL managed with Drizzle ORM, providing a robust and scalable data management solution.
- **Telegram Bot**: Implemented using `node-telegram-bot-api`, offering an alternative interface for user interaction.
- **Authentication**: Managed with Passport.js for secure user login and session management.
- **State Management**: React Context and React Query are used for efficient state management and data fetching on the frontend.

## Development Setup

- **Node.js**: Version 18+ is required for both frontend and backend development.
- **Package Management**: npm is used for managing dependencies and scripts.
- **Build Tools**: Vite is used for building the frontend, providing fast and efficient bundling.
- **TypeScript**: Used throughout the project for type safety and improved developer experience.
- **Environment Configuration**: Managed with `.env` files for different environments (development, production).

## Technical Constraints

- **API Rate Limits**: The Goated.com API has rate limits that must be respected to avoid service disruptions.
- **Database Performance**: Queries must be optimized to handle large volumes of data efficiently.
- **Security**: Sensitive data must be protected, and secure coding practices must be followed.

## Dependencies

- **React**: Core library for building the frontend user interface.
- **Express**: Web framework for building the backend server.
- **Drizzle ORM**: Lightweight ORM for managing database interactions.
- **node-telegram-bot-api**: Library for building the Telegram bot.
- **Passport.js**: Middleware for handling authentication.
- **Zod**: Schema validation library used in conjunction with Drizzle ORM for data integrity.
