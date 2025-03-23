# Vercel Deployment Guide

## Prerequisites
1. Vercel account
2. GitHub repository with your code
3. Database URL (PostgreSQL)
4. Redis URL (if using)

## Environment Variables
Set these in your Vercel project settings:

### Required Variables
- `DATABASE_URL`: Your PostgreSQL connection string
- `SESSION_SECRET`: A secure random string for session management
- `NODE_ENV`: Set to "production"

### Optional Variables
- `REDIS_URL`: If using Redis
- `REDIS_TOKEN`: If using Redis
- `TELEGRAM_BOT_TOKEN`: If using Telegram bot
- `ADMIN_USERNAME`: Admin username
- `ADMIN_PASSWORD`: Admin password

## Deployment Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the main branch
   - Click "Deploy"

3. **Configure Environment Variables**
   - In your Vercel project settings, go to "Environment Variables"
   - Add all required variables listed above
   - Make sure to set `NODE_ENV` to "production"

4. **Deploy**
   - Vercel will automatically detect the build settings
   - The build process will:
     1. Install dependencies
     2. Build the client (Vite)
     3. Build the server (esbuild)
     4. Create the API routes

5. **Verify Deployment**
   - Check the deployment logs for any errors
   - Test the frontend by visiting your Vercel URL
   - Test the API by visiting `your-vercel-url.vercel.app/api/health`

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check the build logs in Vercel
   - Make sure all dependencies are in package.json
   - Verify environment variables are set correctly

2. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Make sure your database allows connections from Vercel's IP range
   - Check that you're using `@neondatabase/serverless` for PostgreSQL

3. **API 404 Errors**
   - Verify your API routes are correctly defined
   - Check that the build process completed successfully
   - Ensure api/index.js was created during the build

4. **Environment Variable Issues**
   - Double-check all environment variables are set
   - Remember that environment variables are case-sensitive
   - Use the Preview feature in Vercel to test environment variables

## Monitoring

1. **Set Up Monitoring**
   - Use Vercel Analytics to monitor performance
   - Consider integrating with Sentry for error tracking
   - Set up alerts for function execution errors

2. **Optimize for Serverless**
   - Keep function execution time under limits
   - Optimize database queries
   - Use connection pooling and caching

## Next Steps

1. Set up a custom domain in Vercel project settings
2. Configure SSL certificates (automatic with Vercel)
3. Set up team access if needed
4. Configure preview deployments for pull requests
