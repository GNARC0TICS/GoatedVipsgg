graph TD
    A[Replit Environment] --> B[Express Server]
    B --> C[Web Application]
    B --> D[API Routes]
    B --> E[Telegram Webhook Handler]
    B --> F[WebSocket Server]
```

## Port Configuration

The server automatically uses the port provided by Replit through process.env.PORT. This ensures proper integration with Replit's infrastructure and enables external access to your application.

```typescript
// Port configuration in server/index.ts
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
```

## Server Initialization Process

1. Port Availability Check
```typescript
// Clear any existing process on the port
await forceKillPort(PORT);

// Wait for port to become available
await waitForPort(PORT);
```

2. Database Connection Test
```typescript
// Verify database connectivity
await testDbConnection();
```

3. Server Setup
```typescript
// Initialize Express with middleware
const app = express();
setupMiddleware(app);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ server });
setupWebSocketHandlers(wss);

// Setup routes
setupAPIRoutes(app);
```

4. Server Start with Replit Integration
```typescript
server.listen(PORT, HOST, () => {
  console.log(`PORT=${PORT}`);
  console.log(`PORT_READY=${PORT}`);
});
```

## Environment Variables

Required environment variables:
```bash
# Core Configuration
NODE_ENV=production
PORT=<provided by Replit>
DATABASE_URL=<your database connection string>

# Security
SESSION_SECRET=<your session secret>
TELEGRAM_BOT_TOKEN=<your bot token>
TELEGRAM_WEBHOOK_SECRET=<your webhook secret>

# API Configuration
ALLOWED_ORIGINS=<comma-separated list of allowed origins>
```

## Deployment Steps

1. Ensure all environment variables are set in Replit's Secrets tab.

2. The server will automatically:
   - Use the Replit-provided port
   - Initialize database connections
   - Set up WebSocket handlers
   - Configure Telegram webhook endpoints
   - Start the web application

3. Verify deployment:
   - Check the health endpoint: `/api/health`
   - Verify Telegram webhook status
   - Test WebSocket connections


## Monitoring & Maintenance

### Health Checks
Monitor these endpoints:
- `/api/health` - System health
- `/api/telegram/status` - Telegram bot status
- `/ws` - WebSocket status

### Logging
The application uses structured logging with different levels:
```typescript
log("info", "Server starting...");
log("error", "Error occurred", { error });
log("warning", "Resource usage high");
```

### Error Handling
The application implements comprehensive error handling:
- Global error handler for Express routes
- WebSocket connection error handling
- Database connection error recovery
- Graceful shutdown handling

## Troubleshooting

### Common Issues

1. Server won't start
```bash
# Check if port is in use
lsof -i :$PORT

# View server logs
tail -f /var/log/goatedvips/app.log
```

2. WebSocket Connection Issues
- Verify WebSocket server initialization
- Check client connection parameters
- Review server logs for connection errors

3. Telegram Webhook Issues
- Confirm webhook URL matches Replit domain
- Verify webhook secret
- Check Telegram bot token validity

## Security Considerations

1. Rate Limiting
```typescript
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60
});
```

2. Session Security
```typescript
app.use(session({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));
```

3. CORS Configuration
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

## Backup & Recovery

1. Database Backups
```bash
# Daily backup script
#!/bin/bash
pg_dump -U postgres goatedvips > /backup/goatedvips_$(date +%Y%m%d).sql
```

2. Configuration Backups
```bash
# Backup critical configs
tar -czf /backup/config_$(date +%Y%m%d).tar.gz \
    .env \
    server/config/*