# GoatedVIPs.gg Production Deployment Guide

This document outlines the steps and best practices for deploying the GoatedVIPs.gg platform to production.

## Prerequisites

- Node.js v18+ and npm v9+
- Access to the production server or hosting platform (Vercel, Replit, etc.)
- Database credentials for production
- Domain name and SSL certificate

## Environment Setup

1. Create a production `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env.production
   ```

2. Update the `.env.production` file with actual production values:
   - Database credentials
   - JWT secrets (use strong, unique values)
   - API endpoints
   - Telegram bot tokens (if applicable)

3. **IMPORTANT**: Never commit the `.env.production` file to the repository.

## Build Process

1. Install dependencies:
   ```
   npm install
   ```

2. Build the application:
   ```
   NODE_ENV=production npm run build
   ```

   This will:
   - Build the client-side React application with Vite
   - Bundle the server-side code with esbuild
   - Output everything to the `dist` directory

3. Verify the build:
   ```
   ls -la dist
   ```

   You should see:
   - `index.js` (server entry point)
   - `public/` directory (client-side assets)

## Deployment

### Option 1: Vercel Deployment

1. Configure Vercel project settings:
   - Set the output directory to `dist`
   - Configure environment variables in the Vercel dashboard
   - Set up custom domains and SSL certificates

2. Deploy using the Vercel CLI or GitHub integration.

### Option 2: Replit Deployment

1. Configure Replit to use the production environment:
   ```
   echo "NODE_ENV=production" >> .replit
   ```

2. Set up the run command in `.replit`:
   ```
   run = "node dist/index.js"
   ```

3. Add all environment variables to the Replit Secrets panel.

### Option 3: Traditional Server Deployment

1. Transfer the `dist` directory and `package.json` to the production server.

2. Install production dependencies:
   ```
   npm install --production
   ```

3. Set up a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start dist/index.js --name goated-vips
   pm2 save
   ```

4. Configure Nginx as a reverse proxy (recommended):
   ```nginx
   server {
       listen 80;
       server_name goatedvips.gg;
       
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

5. Set up SSL with Let's Encrypt:
   ```
   certbot --nginx -d goatedvips.gg
   ```

## Security Considerations

1. **HTTPS**: Ensure all traffic is served over HTTPS.

2. **Headers**: Security headers are automatically set in production mode using Helmet.

3. **Rate Limiting**: API rate limiting is configured for protection against abuse.

4. **Database**: Ensure database connection strings are secure and use SSL.

5. **Secrets**: All JWT tokens, API keys, and other secrets should be stored as environment variables.

## Monitoring and Maintenance

1. Set up health check monitoring:
   - The `/api/health` endpoint provides basic health information
   - Consider integrating with a monitoring service like Uptime Robot

2. Database backups:
   - Configure regular backups of the production database
   - Test restoration procedures periodically

3. Log management:
   - Set up centralized logging (e.g., Papertrail, Loggly)
   - Monitor for errors and unusual patterns

## Rollback Procedure

In case of deployment issues:

1. Identify the last stable version from the deployment history.

2. Redeploy the previous stable version:
   ```
   git checkout [previous-stable-tag]
   npm install
   npm run build
   ```

3. Deploy the previous build following the same deployment steps.

## Performance Optimization

1. **CDN**: Consider using a CDN for static assets.

2. **Caching**: Implement appropriate cache headers for static assets.

3. **Database**: Monitor query performance and add indexes as needed.

## Troubleshooting

Common issues and solutions:

1. **Server not starting**: Check environment variables and database connection.

2. **API errors**: Verify rate limits and database queries.

3. **Client-side errors**: Check browser console and network requests.

4. **Telegram bot issues**: Verify webhook URL and bot token.

## Contact

For deployment assistance, contact the development team at [contact information].
