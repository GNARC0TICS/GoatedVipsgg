graph TD
    A[Nginx Reverse Proxy] --> B[Express Server :5000]
    B --> C[Web Application]
    B --> D[API Routes]
    B --> E[Telegram Webhook Handler]
    B --> F[WebSocket Server]
```

## Technical Implementation

### 1. Express Server Configuration
```typescript
// Route order is critical for proper request handling
app.use('/api/telegram', webhookRouter);  // Handle Telegram webhooks first
app.use('/api', apiRouter);               // Then other API routes
app.use(staticFileHandler);               // Finally, static files
```

### 2. Session Management
- PostgreSQL session store for persistence
- Cookie configuration for security
- Session cleanup mechanism
```typescript
const session = {
  store: new PostgresSessionStore({
    conObject: { connectionString: process.env.DATABASE_URL },
    pruneSessionInterval: 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}
```

### 3. WebSocket Implementation
- Connection pooling for scalability
- Heartbeat mechanism for connection health
- Automatic reconnection handling
```typescript
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

wss.on('connection', (ws) => {
  ws.isAlive = true;
  const pingInterval = setInterval(() => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);
});
```

### 4. Rate Limiting Strategy
Three-tier rate limiting system:
- HIGH: 30 requests per minute
- MEDIUM: 15 requests per minute
- LOW: 5 requests per minute

Applied per endpoint category:
```typescript
const rateLimits = {
  HIGH: { points: 30, duration: 60 },
  MEDIUM: { points: 15, duration: 60 },
  LOW: { points: 5, duration: 60 }
};
```

## Environment Setup

### Required Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/goatedvips

# Security
SESSION_SECRET=your_session_secret
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# API Configuration
API_TOKEN=your_api_token
ALLOWED_ORIGINS=https://goatedvips.gg
```

### Database Configuration
1. Create PostgreSQL database:
```sql
CREATE DATABASE goatedvips;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

2. Run migrations:
```bash
npm run db:push
```

## Deployment Steps

### 1. Application Setup
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm run start
```

### 2. Nginx Configuration
Create `/etc/nginx/sites-available/goatedvips`:

```nginx
server {
    listen 443 ssl http2;
    server_name goatedvips.gg;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/goatedvips.gg/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/goatedvips.gg/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main Application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/goatedvips /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Certificate Setup
```bash
sudo certbot --nginx -d goatedvips.gg
```

### 4. Telegram Bot Configuration
1. Set webhook URL:
```bash
curl -F "url=https://goatedvips.gg/api/telegram/webhook" \
     -F "secret_token=your_webhook_secret" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

2. Verify webhook:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## Monitoring & Maintenance

### Health Checks
Monitor these endpoints:
- `/api/health` - System health
- `/api/telegram/status` - Telegram bot status
- `/ws` - WebSocket status

### Logging Structure
```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  component: string;
  message: string;
  metadata?: Record<string, any>;
}
```

### Performance Metrics
Track:
- Response times per endpoint
- WebSocket connection count
- Session count
- Cache hit rates
- Error rates


### Logging
Logs are stored in:
- Application logs: `/var/log/goatedvips/app.log`
- Nginx access logs: `/var/log/nginx/access.log`
- Nginx error logs: `/var/log/nginx/error.log`

### Backup Strategy
1. Database backups:
```bash
#!/bin/bash
# Daily backup script
pg_dump -U postgres goatedvips > /backup/goatedvips_$(date +%Y%m%d).sql
```

2. Configuration backups:
```bash
#!/bin/bash
# Backup critical configs
tar -czf /backup/config_$(date +%Y%m%d).tar.gz \
    /etc/nginx/sites-available/goatedvips \
    /etc/letsencrypt/live/goatedvips.gg/ \
    .env
```

## Troubleshooting Guide

### Common Issues

1. WebSocket Connection Failures
```typescript
// Check these areas:
- Nginx WebSocket configuration
- Client connection parameters
- Server logs for connection errors
```

2. Session Management Issues
```typescript
// Verify:
- PostgreSQL session table exists
- Session cookie settings
- Session cleanup job running
```

3. Rate Limiting Problems
```typescript
// Check:
- Rate limit configuration
- Client IP detection
- Headers in Nginx config
```

3. Webhook not receiving updates:
- Check Nginx logs for routing issues
- Verify SSL certificate is valid
- Confirm webhook secret token matches


## Emergency Procedures

1. Quick Server Restart
```bash
pm2 restart all
```

2. Session Store Recovery
```sql
-- Verify session table
SELECT * FROM session WHERE expire > NOW() LIMIT 1;
```

3. Cache Reset
```typescript
cacheManager.clear();
```


## Security Guidelines

### 1. Request Validation
All incoming requests must be validated:
```typescript
// Example validation middleware
const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: result.error.issues
    });
  }
  next();
};
```

### 2. Authentication Flow
```mermaid
sequenceDiagram
    Client->>Server: Login Request
    Server->>Database: Verify Credentials
    Database-->>Server: User Data
    Server->>Session Store: Create Session
    Server-->>Client: Session Cookie
```

### 3. Webhook Security
Telegram webhook validation:
```typescript
const validateWebhook = (req, res, next) => {
  const token = req.header('X-Telegram-Bot-Api-Secret-Token');
  if (token !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Invalid webhook token' });
  }
  next();
};
```

## Maintenance Procedures

### 1. Regular Updates
```bash
# Update application
git pull
npm install
npm run build
pm2 restart all

# Update system
sudo apt update
sudo apt upgrade
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Log Rotation
```nginx
# Nginx log rotation config
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then
            run-parts /etc/logrotate.d/httpd-prerotate
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
```

### 3. Monitoring Setup
Configure monitoring for:
- CPU usage
- Memory usage
- Disk space
- Network traffic
- Application errors
- API response times

Set up alerts for:
- Server resource thresholds
- Error rate spikes
- Failed health checks
- SSL certificate expiration

## Recovery Procedures

### 1. Database Recovery
```bash
# Restore from backup
psql -U postgres goatedvips < /backup/goatedvips_YYYYMMDD.sql
```

### 2. Application Recovery
```bash
# Rollback to last working version
git reset --hard <last_working_commit>
npm install
npm run build
pm2 restart all