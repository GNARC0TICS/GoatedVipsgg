External API -> Transform Service -> Database -> WebSocket -> UI Update
```
- 30-second cache for high-traffic endpoints
- Rate limits: 
  - High: 30 requests/minute
  - Medium: 15 requests/minute
  - Low: 5 requests/minute

### 2. Verification Flow
```
User Request -> Telegram Bot -> Admin Queue -> Database Update -> User Notification
```
- Automatic status checks
- Multi-step verification
- Admin review interface

## Real-time Features

### 1. WebSocket Channels
- `/ws/leaderboard` - Race updates
- `/ws/transformation-logs` - System monitoring
- Ping interval: 30 seconds
- Automatic reconnection
- Connection health monitoring

### 2. API Endpoints
- `/api/wager-races/current` - Active race data
- `/api/affiliate/stats` - Performance metrics
- `/api/admin/analytics` - System analytics
- `/api/telegram/status` - Bot health check

### 3. Data Transformation
```typescript
interface TransformationResult {
  success: boolean;
  data?: {
    wagers: number;
    profit: number;
    activeUsers: number;
  };
  error?: string;
  duration: number;
}
```

### 4. Error Handling
- Structured error responses
- Automatic retry mechanism
- Error logging and monitoring
- User-friendly error messages

### 5. Performance Metrics
- Response time monitoring
- WebSocket connection stats
- Cache hit ratios
- API usage analytics

### 6. Security Measures
- Rate limiting per endpoint
- JWT token validation
- IP-based restrictions
- Admin action logging

## Database Schema
```sql
Table wager_races {
  id UUID PRIMARY KEY
  status VARCHAR
  start_date TIMESTAMP
  end_date TIMESTAMP
  prize_pool DECIMAL
}

Table users {
  id UUID PRIMARY KEY
  telegram_id VARCHAR UNIQUE
  username VARCHAR
  verification_status VARCHAR
  created_at TIMESTAMP
}

Table transformation_logs {
  id UUID PRIMARY KEY
  type VARCHAR
  message TEXT
  duration_ms INTEGER
  created_at TIMESTAMP
}