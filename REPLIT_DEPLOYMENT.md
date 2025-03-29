# GoatedVIPs.gg Replit Deployment Guide

This guide explains how to deploy and run the GoatedVIPs.gg platform on Replit, both for development and production environments.

## Quick Start

1. Create a new Repl and import the repository
2. Let Replit detect the configuration (it will use the `.replit` file)
3. Set up your environment variables in Replit's Secrets tab
4. Click "Run" to start the application

## Detailed Setup Steps

### 1. Environment Setup

In your Repl's "Secrets" tab, add the following environment variables:

```bash
# Required Environment Variables
DATABASE_URL=<your-replit-postgres-url>
GOATED_TOKEN=<your-goated-api-token>
JWT_SECRET=<generate-a-secure-secret>
SESSION_SECRET=<generate-a-secure-secret>

# Optional (for Telegram bot)
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
TELEGRAM_ADMIN_ID=<your-admin-telegram-id>
```

### 2. Database Setup

The application will automatically:
- Use Replit's built-in PostgreSQL database
- Handle SSL connections
- Manage connection pooling
- Run migrations on startup

### 3. Development Mode

To run in development mode:

1. Click the "Run" button in Replit
2. The application will start in development mode with:
   - Hot Module Replacement (HMR)
   - Source maps enabled
   - Development error overlays
   - Automatic restart on file changes

### 4. Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in Replit Secrets
2. The application will automatically:
   - Build optimized assets
   - Enable production optimizations
   - Use SSL for database connections
   - Configure proper security headers

## Configuration Details

### Ports and URLs

- Main application: `https://<repl-name>.<username>.repl.co`
- API endpoints: `https://<repl-name>.<username>.repl.co/api`
- WebSocket: `wss://<repl-name>.<username>.repl.co`

### Resource Optimization

The application is optimized for Replit's environment:

- **Database Connections**: 
  - Maximum connections: 10
  - Minimum connections: 1
  - Idle timeout: 30 seconds

- **Build Optimization**:
  - Code splitting enabled
  - Tree shaking
  - Minification
  - Vendor chunk optimization

- **Memory Management**:
  - Optimized connection pooling
  - Automatic garbage collection
  - Resource cleanup on shutdown

## Troubleshooting

### Common Issues

1. **Recovery Mode / npm Command Not Found**
   - If you see `bash: npm: command not found` in recovery mode:
     ```bash
     # Method 1: Run the recovery helper script
     chmod +x scripts/replit-recovery.sh
     ./scripts/replit-recovery.sh
     
     # Method 2: Use the new start script with auto-detection
     chmod +x scripts/start.sh
     ./scripts/start.sh
     
     # Method 3: Try installing Node.js manually
     nix-env -i nodejs
     ```
   - The `scripts/replit-recovery.sh` script will locate Node.js and npm, and create helper scripts for you to use
   - The `scripts/start.sh` script has built-in recovery mode detection and will try to fix it automatically

2. **Database Connection Errors**
   - Check if DATABASE_URL is set correctly in Secrets
   - Verify PostgreSQL service is running
   - Check connection limits

3. **Build Failures**
   - Clear Replit's cache
   - Verify all dependencies are installed
   - Check build logs for specific errors

4. **Runtime Errors**
   - Check the console for error messages
   - Verify environment variables are set
   - Check memory usage in Replit's dashboard

5. **Getting Out of Recovery Mode**
   - Try hitting Ctrl+C to exit the recovery process
   - Try running: `node -e "process.exit(0)"`
   - Create a small file change to force a refresh
   - Reload the Replit tab in your browser

### Debugging

1. Access logs:
   ```bash
   # View application logs
   tail -f .replit/logs/console.log
   
   # View database logs
   tail -f .replit/logs/postgresql.log
   ```

2. Check resource usage:
   ```bash
   htop  # Monitor system resources
   lsof  # Check open ports and files
   ```

3. Database debugging:
   ```bash
   pgcli $DATABASE_URL  # Interactive PostgreSQL client
   ```

## Performance Monitoring

Monitor your application's performance:

1. **Database Performance**
   - Connection pool status
   - Query execution times
   - Index usage

2. **Application Metrics**
   - Response times
   - Error rates
   - Memory usage

3. **Resource Usage**
   - CPU utilization
   - Memory consumption
   - Disk usage

## Security Considerations

1. **Environment Variables**
   - Use Replit's Secrets feature
   - Never commit sensitive data
   - Rotate secrets regularly

2. **Database Security**
   - SSL connections enabled
   - Connection pooling limits
   - Query timeout limits

3. **API Security**
   - Rate limiting enabled
   - CORS configured
   - Security headers set

## Maintenance

### Regular Tasks

1. **Database Maintenance**
   ```bash
   # Run migrations
   npm run db:migrate
   
   # Check database status
   npm run db:status
   ```

2. **Cache Management**
   ```bash
   # Clear build cache
   rm -rf dist
   rm -rf node_modules/.vite
   ```

3. **Updates**
   ```bash
   # Update dependencies
   npm update
   
   # Check for security updates
   npm audit
   ```

### Backup and Recovery

1. **Database Backups**
   - Automated daily backups
   - Manual backup command available
   - Backup verification process

2. **Application State**
   - Session data persistence
   - Cache recovery procedures
   - Error recovery mechanisms

## Support and Resources

- Report issues on the project repository
- Check Replit's documentation for platform-specific guidance
- Join our Discord community for support

Remember to monitor your Repl's resources and performance metrics regularly to ensure optimal operation.
