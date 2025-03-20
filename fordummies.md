# GoatedVIPs.gg Platform Guide

Welcome to the GoatedVIPs.gg platform guide! This document explains how our platform works, how data flows through the system, and provides multiple deployment options to get you up and running.

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [How the Platform Works](#how-the-platform-works)
3. [Account Linking System](#account-linking-system)
4. [Telegram Bot Integration](#telegram-bot-integration)
5. [Deployment Options](#deployment-options)
   - [Replit Deployment](#replit-deployment)
   - [Vercel Deployment](#vercel-deployment)
   - [Traditional Server Deployment](#traditional-server-deployment)
   - [All-in-One Server Deployment](#all-in-one-server-deployment)
6. [Maintenance and Troubleshooting](#maintenance-and-troubleshooting)

## Platform Overview

GoatedVIPs.gg is a next-generation VIP leaderboard and rewards platform for Goated.com players who use the referral codes VIPBOOST or GOATEDVIPS. The platform serves as a reward hub and wager race leaderboard for affiliates and their players.

### Key Components

- **Frontend**: Next.js React application with Tailwind CSS for styling
- **Backend**: Express.js API server with various middleware for security and performance
- **Database**: PostgreSQL database using Drizzle ORM for data management
- **Telegram Bot**: Node.js bot for user interaction and notifications
- **Authentication**: Separate login points for public users and admins

### Core Features

- Real-time leaderboards (daily, weekly, monthly, all-time)
- Wager races & competitions with live updates
- User authentication (email/password for users, custom admin login)
- API integration with Goated.com for tracking wager data
- Three-way account linking (platform, Goated.com, Telegram)
- Admin dashboard for site management

## How the Platform Works

### Data Flow Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Goated.com │     │ GoatedVIPs  │     │   User's    │
│     API     │────▶│   Server    │────▶│   Browser   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    ▲
                          │                    │
                          ▼                    │
                    ┌─────────────┐     ┌─────────────┐
                    │  Database   │     │  Telegram   │
                    │ (PostgreSQL)│◀───▶│     Bot     │
                    └─────────────┘     └─────────────┘
```

### Data Processing Pipeline

1. **Data Collection**:
   - The server fetches wager data from the Goated.com API every 15 minutes
   - Data includes user identifiers, wager amounts, and timestamps

2. **Data Transformation**:
   - Raw API data is normalized and validated
   - Wager amounts are processed for different time periods (daily, weekly, monthly)
   - Leaderboard rankings are calculated

3. **Data Storage**:
   - Processed data is stored in the PostgreSQL database
   - Historical data is maintained for trends and analysis
   - User relationships are established through the account linking system

4. **Data Presentation**:
   - Frontend fetches data from our API endpoints
   - Real-time updates via React Query for fresh data
   - Leaderboards display user rankings and statistics
   - Wager races show current standings and prize pools

### Database Structure

The database is organized into several key tables:

- **users**: Platform user accounts
- **telegramUsers**: Telegram user information
- **wagerRaces**: Active and historical wager competitions
- **wagerRaceParticipants**: User participation in races
- **verificationRequests**: Account linking verification requests
- **affiliateStats**: Wager statistics from the Goated.com API

## Account Linking System

One of the most powerful features of GoatedVIPs.gg is the three-way account linking system that connects:

1. **Platform Accounts**: Created when users register on our website
2. **Goated.com Accounts**: External accounts with wager stats (accessed via API)
3. **Telegram Accounts**: For bot interactions and real-time notifications

### How Account Linking Works

#### Initial State: Placeholder Accounts

- All Goated.com users have placeholder accounts on our platform
- These accounts contain:
  - Goated.com UID
  - Goated.com username
  - Wager statistics from the API
- These accounts initially exist without direct user access

#### User Registration and Account Claiming

1. **User Registration**:
   - User registers on GoatedVIPs.gg with email/password
   - A new platform account is created in the `users` table

2. **Account Claiming Process**:
   - User initiates verification to claim their Goated.com account
   - User provides their Goated.com username
   - Admin verifies the ownership (manual verification for security)
   - Upon verification, the placeholder account is linked to their platform account
   - All historical data and statistics are preserved during the linking

3. **Telegram Linking** (Optional):
   - User can also link their Telegram account
   - User initiates verification through the Telegram bot
   - Admin verifies the request
   - Telegram account is linked to the platform account

### Verification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │    Admin    │     │  Database   │
│  Interface  │     │  Dashboard  │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Submit Request    │                   │
       │───────────────────┼───────────────────▶
       │                   │                   │
       │                   │ View Requests     │
       │                   │◀──────────────────┤
       │                   │                   │
       │                   │ Approve/Reject    │
       │                   │───────────────────▶
       │                   │                   │
       │ Notification      │                   │
       │◀──────────────────┼───────────────────┤
       │                   │                   │
```

### Benefits of Account Linking

- **Data Integrity**: All historical wager data is preserved
- **Security**: Admin verification prevents fraudulent claims
- **Flexibility**: Users can interact with the platform via website or Telegram
- **Unified Experience**: Single identity across all platforms

## Telegram Bot Integration

The Telegram bot provides an alternative interface to the platform, allowing users to check stats, participate in challenges, and receive notifications without visiting the website.

### Bot Setup

The bot is implemented using the `node-telegram-bot-api` library and connects to the same database as the main platform.

### Available Commands

- **/verify**: Link Telegram account to Goated.com account
- **/stats**: View personal wager statistics
- **/check_stats [username]**: Check stats for a specific username
- **/leaderboard**: View current leaderboard standings
- **/race**: Check current race position
- **/help**: Display available commands

### Verification Process via Telegram

1. User sends `/verify` command to the bot
2. Bot prompts user to provide their Goated.com username
3. User provides username
4. Bot creates a verification request in the database
5. Admin reviews and approves the request
6. Bot notifies user of successful verification
7. User can now use all bot features with their linked account

### Admin Commands

- **/verify_user [telegram_id]**: Approve a verification request
- **/list_requests**: List pending verification requests
- **/reject_user [telegram_id]**: Reject a verification request
- **/broadcast [message]**: Send message to all verified users

## Deployment Options

GoatedVIPs.gg can be deployed in several ways depending on your needs and resources. Here are the most common deployment options:

### Replit Deployment

Replit provides a simple, all-in-one hosting solution that's great for getting started quickly.

#### Setup Steps

1. **Fork the Repository**:
   - Create a Replit account if you don't have one
   - Fork the GoatedVIPs.gg repository to your Replit account

2. **Configure Environment Variables**:
   - Create a `.env` file based on `.env.example`
   - Add your database credentials, JWT secrets, and API endpoints
   - Set up Telegram bot token if using the bot

3. **Set Up Database**:
   - Create a PostgreSQL database (Replit provides this)
   - Run the database migrations: `npm run db:migrate`

4. **Configure Replit**:
   - Set the run command in `.replit`: `npm start`
   - Add environment variables to Replit Secrets panel

5. **Deploy**:
   - Click "Run" to start your application
   - Replit will provide a URL for your application

#### Advantages

- Simple setup process
- All-in-one solution (frontend, backend, database)
- Free tier available for testing
- Automatic HTTPS

#### Limitations

- Limited resources on free tier
- May experience cold starts
- Less control over infrastructure

### Vercel Deployment

Vercel is ideal for deploying the frontend, with options for handling the backend.

#### Frontend Deployment

1. **Prepare Your Project**:
   - Ensure your project has a proper `package.json` with build scripts
   - Configure `next.config.js` for production settings

2. **Connect to Vercel**:
   - Create a Vercel account
   - Import your GitHub repository
   - Configure build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist/public`

3. **Environment Variables**:
   - Add all required environment variables in Vercel dashboard
   - Set `NODE_ENV=production`

4. **Deploy**:
   - Trigger deployment from Vercel dashboard
   - Vercel will build and deploy your frontend

#### Backend Options

**Option 1: Vercel Serverless Functions**

1. Create API routes in `/api` directory
2. Configure `vercel.json` to handle API routes
3. Deploy alongside frontend

**Option 2: Separate Backend**

1. Deploy backend separately on a service like Heroku, Railway, or DigitalOcean
2. Configure CORS to allow requests from Vercel frontend
3. Update frontend API endpoints to point to backend URL

#### Database Setup

1. Use a managed PostgreSQL service (Neon, Supabase, etc.)
2. Configure connection string in environment variables
3. Run migrations on the database

#### Advantages

- Excellent for frontend performance
- Automatic CI/CD from GitHub
- Free tier available
- Global CDN

#### Limitations

- Serverless functions have execution limits
- Separate backend may require additional configuration

### Traditional Server Deployment

For more control and performance, deploying to a VPS (Virtual Private Server) is a good option.

#### Server Setup

1. **Provision a Server**:
   - Choose a provider (DigitalOcean, AWS, Linode, etc.)
   - Select an appropriate plan (2GB RAM minimum recommended)
   - Choose Ubuntu 20.04 or later

2. **Install Dependencies**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm nginx postgresql
   sudo npm install -g pm2
   ```

3. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/GoatedVipsgg.git
   cd GoatedVipsgg
   npm install
   ```

4. **Configure Environment**:
   - Create `.env` file with production values
   - Set up PostgreSQL database
   - Run migrations: `npm run db:migrate`

5. **Build Application**:
   ```bash
   NODE_ENV=production npm run build
   ```

#### Nginx Configuration

Create a new Nginx configuration file:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Process Management with PM2

```bash
pm2 start dist/index.js --name goated-vips
pm2 save
pm2 startup
```

#### SSL Setup

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Advantages

- Full control over server resources
- Better performance for high-traffic sites
- No cold starts or execution limits
- Ability to run background processes

#### Limitations

- More complex setup
- Requires server management knowledge
- Higher cost than serverless options

### All-in-One Server Deployment

This approach runs both frontend and backend on a single server for simplicity.

#### Setup Steps

1. Follow the Traditional Server Deployment steps above
2. Configure the application to serve the frontend from the backend:
   - In `server/index.ts`, ensure the static file serving is enabled
   - Build the frontend to be served by the backend

3. **Single Command Startup**:
   ```bash
   pm2 start dist/index.js --name goated-vips
   ```

4. **Domain Configuration**:
   - Point your domain to your server IP
   - Configure Nginx as shown in the Traditional Deployment section
   - Set up SSL with Let's Encrypt

#### Advantages

- Simplified deployment process
- Single codebase to manage
- Reduced infrastructure costs
- Easier debugging (everything in one place)

#### Limitations

- Less scalability for high-traffic sites
- Single point of failure
- Frontend and backend scaling tied together

## Maintenance and Troubleshooting

### Regular Maintenance Tasks

1. **Database Backups**:
   ```bash
   # Create a backup
   pg_dump -U username -d database_name > backup_$(date +%Y%m%d).sql
   
   # Schedule daily backups with cron
   0 0 * * * pg_dump -U username -d database_name > /path/to/backups/backup_$(date +%Y%m%d).sql
   ```

2. **Log Rotation**:
   - Configure log rotation to prevent disk space issues
   - Use logrotate or PM2's built-in log rotation

3. **Updates and Security Patches**:
   ```bash
   # Update dependencies
   npm audit fix
   
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   ```

4. **Performance Monitoring**:
   - Use PM2 monitoring: `pm2 monit`
   - Consider adding application monitoring (New Relic, Datadog, etc.)

### Common Issues and Solutions

#### Database Connection Issues

**Symptoms**: Server fails to start, database connection errors in logs

**Solutions**:
1. Check database credentials in `.env` file
2. Verify PostgreSQL is running: `sudo systemctl status postgresql`
3. Check network connectivity to database
4. Verify database user permissions

#### API Rate Limiting

**Symptoms**: Users receive 429 Too Many Requests errors

**Solutions**:
1. Adjust rate limits in `server/middleware/rate-limiter.ts`
2. Implement caching for frequently accessed data
3. Add retry logic with exponential backoff in frontend

#### Telegram Bot Issues

**Symptoms**: Bot not responding, verification not working

**Solutions**:
1. Check `TELEGRAM_BOT_TOKEN` in environment variables
2. Verify webhook URL is correct and accessible
3. Restart the bot: `pm2 restart goated-vips`
4. Check Telegram API status

#### Memory Issues

**Symptoms**: Application crashes, out of memory errors

**Solutions**:
1. Increase server resources
2. Optimize database queries
3. Implement proper pagination for large data sets
4. Add memory limits to PM2: `pm2 start dist/index.js --max-memory-restart 1G`

### Health Monitoring

The application includes a built-in health check endpoint at `/api/health` that provides:
- Database connection status
- API service status
- Environment information
- Uptime statistics

Use this endpoint with monitoring services like Uptime Robot or Pingdom to get alerts when the service is down.

### Scaling Considerations

As your user base grows, consider these scaling options:

1. **Vertical Scaling**:
   - Increase server resources (CPU, RAM)
   - Optimize database with proper indexes

2. **Horizontal Scaling**:
   - Split frontend and backend to separate servers
   - Use load balancer for multiple backend instances
   - Implement Redis for session storage and caching

3. **Database Scaling**:
   - Use connection pooling
   - Consider read replicas for heavy read operations
   - Implement database sharding for very large datasets
