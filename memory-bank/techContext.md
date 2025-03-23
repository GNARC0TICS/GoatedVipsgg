# Technical Context

## Technologies Used

- **Frontend**: React with TypeScript, utilizing Tailwind CSS for styling and Shadcn UI components for a consistent design system.
- **Backend**: Express.js server written in TypeScript, handling API requests, authentication, and business logic.
- **Database**: PostgreSQL managed with Drizzle ORM and `@neondatabase/serverless` for serverless compatibility.
- **Deployment Platforms**: 
  - **Vercel**: Primary production deployment using serverless architecture.
  - **Replit**: Alternative deployment with persistent server environment.

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
- **Serverless Limitations**: 
  - Execution time limited to 60 seconds per request on Vercel Pro plan
  - Cold starts may affect initial response times
  - Connection pooling works differently in serverless environments
  - State cannot be stored between function invocations

## Dependencies

- **React**: Core library for building the frontend user interface.
- **Express**: Web framework for building the backend server.
- **Drizzle ORM**: Lightweight ORM for managing database interactions.
- **@neondatabase/serverless**: Serverless-compatible PostgreSQL client.
- **node-telegram-bot-api**: Library for building the Telegram bot.
- **Passport.js**: Middleware for handling authentication.
- **Zod**: Schema validation library used in conjunction with Drizzle ORM for data integrity.

## Deployment Configurations

### Vercel Specific Configuration
- **vercel.json**: Defines build settings, environment variables, and cron jobs.
- **Database Connection**: Uses serverless-compatible connection with `@neondatabase/serverless`.
- **Environment Variables**: Required variables documented in `.env.example.vercel`.
- **Cron Jobs**: Scheduled tasks configured through Vercel cron functionality.
- **Cold Starts**: Optimized database connection for faster cold starts.

### Replit Specific Configuration
- **.replit**: Configures the Replit environment with proper port mapping and commands.
- **Database Connection**: Uses traditional connection pooling approach.
- **Environment Variables**: Configured through Replit's secrets management.
- **Persistent Server**: Takes advantage of long-running processes for caching and background tasks.
