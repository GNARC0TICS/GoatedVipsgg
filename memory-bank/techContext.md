# Technical Context

## Technologies Used

- **Frontend**: React with TypeScript, utilizing Tailwind CSS for styling and Shadcn UI components for a consistent design system.
- **Backend**: Express.js server written in TypeScript, handling API requests, authentication, and business logic.
- **Database**: PostgreSQL managed with Drizzle ORM, providing a robust and scalable data management solution.
- **Telegram Bot**: Implemented using `node-telegram-bot-api`, offering an alternative interface for user interaction.
- **Authentication**: Managed with Passport.js for secure user login and session management.
- **State Management**: React Context and React Query are used for efficient state management and data fetching on the frontend.
- **Error Handling**: Comprehensive error handling with fallback mechanisms for API failures and data loading issues.

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
- **Network Reliability**: External API calls must handle timeouts, connection issues, and service outages gracefully.

## Dependencies

- **React**: Core library for building the frontend user interface.
- **Express**: Web framework for building the backend server.
- **Drizzle ORM**: Lightweight ORM for managing database interactions.
- **node-telegram-bot-api**: Library for building the Telegram bot.
- **Passport.js**: Middleware for handling authentication.
- **Zod**: Schema validation library used in conjunction with Drizzle ORM for data integrity.
- **React Query**: Data fetching and caching library with built-in error handling and retry logic.

## Error Handling & Resilience

- **Multiple Endpoint Retry**: System attempts multiple endpoints before failing, improving reliability.
- **Fallback API Routes**: Dedicated routes serve sample data when main API endpoints fail.
- **Request Timeouts**: All API requests have configurable timeouts to prevent hanging operations.
- **Sample Data Generation**: Utilities generate realistic sample data for a better user experience during API outages.
- **Client-Side Fallbacks**: Components gracefully degrade with fallback UI when data is unavailable.
- **Caching Strategy**: Aggressive caching of API responses to reduce dependency on external services.
- **Static File Optimization**: Enhanced static file serving with proper caching headers and compression.
