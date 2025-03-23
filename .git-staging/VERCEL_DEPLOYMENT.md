# Migrating GoatedVIPs.gg to Vercel

This guide provides step-by-step instructions for deploying the GoatedVIPs.gg platform on Vercel. The platform has been optimized to work with Vercel's serverless architecture.

## Prerequisites

- A Vercel account ([Sign up here](https://vercel.com/signup) if you don't have one)
- A GitHub account with the project repository
- Access to a PostgreSQL database (we recommend [Neon](https://neon.tech/) for serverless compatibility)
- Access to Redis caching service (we recommend [Upstash Redis](https://upstash.com/) for serverless compatibility)

## Preparation Steps

1. **Set up PostgreSQL Database**
   - Create a new PostgreSQL database on Neon or another provider
   - Ensure you enable connection pooling for serverless environments
   - Save your connection string for the next steps

2. **Set up Redis for Caching**
   - Create a Redis database on Upstash
   - Save the Redis URL and token for configuration

3. **Configure Environment Variables**
   - Use `.env.example.vercel` as a template for your environment variables
   - Fill in all required values, including database credentials

## Deployment Steps

### Option 1: Deploying via Vercel Dashboard

1. **Import Project to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Follow the prompts to configure project

2. **Configure Build Settings**
   - Framework Preset: Select "Other"
   - Build Command: `npm run vercel-build`
   - Output Directory: `client/dist`
   - Install Command: `npm install`

3. **Configure Environment Variables**
   - Add all environment variables from your `.env.example.vercel` file
   - Be sure to provide actual values for each variable

4. **Deploy Project**
   - Click "Deploy"
   - Wait for the build and deployment to complete

### Option 2: Deploying via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Configure Project**
   ```bash
   vercel
   ```
   Follow the prompts to configure your project.

4. **Deploy with Environment Variables**
   ```bash
   vercel --env DATABASE_URL=your-database-url --env REDIS_URL=your-redis-url # Add all other required environment variables
   ```

## Post-Deployment Configuration

### Domain Configuration

1. **Configure Custom Domains**
   - Go to Project Settings → Domains
   - Add your domains (e.g., goatedvips.gg, goombas.net)
   - Follow instructions to verify domain ownership and set up DNS

### Setting Up Cron Jobs

1. **Enable Cron Jobs**
   - Vercel automatically detects the `crons` section in `vercel.json`
   - Go to Project Settings → Cron Jobs to verify they are set up

2. **Verify Cron Jobs**
   - Visit the `/api/cron/health` endpoint to verify the cron service is running
   - The first scheduled execution will happen according to the schedule in `vercel.json`

## Database Migration

1. **Run Database Migrations**
   You can run migrations in one of two ways:

   a. **Using Vercel CLI**
   ```bash
   vercel env pull .env.production
   npm run db:push
   ```

   b. **Using Vercel Console**
   - Create a new deployment hook in the Vercel dashboard
   - Run the hook with `?trigger=migration` parameter

## Monitoring & Troubleshooting

1. **View Logs**
   - Go to Project → Deployments → Select deployment → Logs
   - Filter logs by function or severity

2. **Set Up Monitoring**
   - Consider setting up monitoring via Vercel Analytics
   - Set up alerts for function errors and performance issues

3. **Common Issues**
   - Cold starts: First request may be slow; keep functions warm with cron jobs
   - Memory limits: Serverless functions have 1GB RAM limit
   - Execution time: Functions timeout after 60 seconds in Hobby plan

## Serverless Optimization Tips

1. **Database Connection Handling**
   - Use connection pooling for database connections
   - Implement retry logic for database operations

2. **File System Limitations**
   - Serverless functions cannot rely on local file system for persistence
   - Use database or external storage for any files

3. **State Management**
   - Functions are stateless; use Redis or similar for state
   - Don't rely on memory between function invocations

## Rollback Procedure

If you need to roll back to the previous deployment:

1. Go to Project → Deployments
2. Find the previous successful deployment
3. Click "..." → "Promote to Production"

## Security Considerations

1. Ensure all secrets are stored as environment variables
2. Set up proper access control for admin routes
3. Use Vercel's edge functions for geolocation-based access control if needed

## Contact & Support

If you encounter issues during deployment, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs) (if using Neon for PostgreSQL)
- [Upstash Documentation](https://docs.upstash.com/) (if using Upstash for Redis)
