# Technical Implementation Details

This document provides technical details and code examples for key parts of the Affiliate Marketing Platform.

## Database Schema and ORM

The project uses PostgreSQL with Drizzle ORM for database operations. Below are key schema definitions:

### User Schema

```typescript
// From db/schema.ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  
  // Goated.com account linking fields
  goatedUid: text("goated_uid").unique(),
  goatedUsername: text("goated_username"),
  isGoatedVerified: boolean("is_goated_verified").default(false),
  goatedVerifiedAt: timestamp("goated_verified_at"),
  
  // Telegram account linking fields
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  isTelegramVerified: boolean("is_telegram_verified").default(false),
  telegramVerifiedAt: timestamp("telegram_verified_at"),
});
```

### Database Relations

Relations between tables are defined using Drizzle's relations API:

```typescript
// From db/schema.ts
export const userRelations = relations(users, ({ one, many }) => ({
  preferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  createdRaces: many(wagerRaces),
  raceParticipations: many(wagerRaceParticipants),
  supportTickets: many(supportTickets),
  assignedTickets: many(supportTickets, { relationName: "assignedTickets" }),
  goatedVerifications: many(goatedVerificationRequests),
  telegramVerifications: many(telegramVerificationRequests),
}));
```

### Schema Validation with Zod

The project uses Drizzle-Zod integration for schema validation:

```typescript
// From db/schema.ts
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
```

## API Implementation

### Express Routes

The backend API is built with Express and structured around RESTful principles:

```typescript
// Example from server/routes.ts
import express from 'express';
import { db } from '../db';
import { users, wagerRaces } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from './middleware/auth';

const router = express.Router();

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        preferences: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive data
    const { password, ...userProfile } = user;
    return res.json(userProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Authentication Middleware

Authentication is handled via middleware:

```typescript
// Example from server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const user = await db.query.users.findFirst({
      where: eq(users.id, (decoded as any).userId)
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
```

## Frontend Implementation

### React Components

The application uses functional React components with hooks:

```tsx
// Example component: client/src/components/LeaderboardTable.tsx
import React from 'react';
import { useLeaderboard } from '../hooks/use-leaderboard';
import { Avatar } from './ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { LoadingSpinner } from './LoadingSpinner';

export const LeaderboardTable: React.FC = () => {
  const { data: leaderboardData, isLoading, error } = useLeaderboard();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading leaderboard</div>;
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Total Wager</TableHead>
          <TableHead>Commission</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaderboardData?.map((entry, index) => (
          <TableRow key={entry.userId}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar src={entry.avatar} alt={entry.username} />
                <span>{entry.username}</span>
              </div>
            </TableCell>
            <TableCell>${entry.totalWager.toFixed(2)}</TableCell>
            <TableCell>${entry.commission.toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

### Custom Hooks

The application implements custom hooks for reusable logic:

```tsx
// Example from client/src/hooks/use-leaderboard.ts
import { useQuery } from '@tanstack/react-query';

interface LeaderboardEntry {
  userId: number;
  username: string;
  avatar: string;
  totalWager: number;
  commission: number;
}

export const useLeaderboard = () => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/affiliate/stats');
      if (!response.ok) {
        throw new Error('Error fetching leaderboard data');
      }
      const data = await response.json();
      return data.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
```

## Telegram Bot Integration

The platform integrates with Telegram for user interactions:

```typescript
// Example from server/telegram/bot.ts
import TelegramBot from 'node-telegram-bot-api';
import { db } from '../../db';
import { telegramVerificationRequests, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `Welcome to the Goated Affiliate Bot! 🎮\n\nI'm here to help you track your affiliate marketing performance and earnings.`;
  
  await bot.sendPhoto(chatId, './server/telegram/BOTWELCOME.png', {
    caption: welcomeMessage,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Link My Account', callback_data: 'link_account' }],
        [{ text: 'View Commands', callback_data: 'view_commands' }]
      ]
    }
  });
});

bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const action = callbackQuery.data;
  
  if (action === 'link_account') {
    await bot.sendMessage(chatId, 'To link your account, please enter your username:');
    // Bot will wait for next message in another handler
  } else if (action === 'view_commands') {
    const commandsHelp = `
*Available Commands:*
/stats - View your current stats
/earnings - Check your earnings
/rank - See your position on the leaderboard
/promotions - View active promotions
/help - Get assistance
    `;
    await bot.sendMessage(chatId, commandsHelp, { parse_mode: 'Markdown' });
  }
});
```

## State Management

The application uses React Query for server state and React Context for client state:

```tsx
// Example from client/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth as firebaseAuth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Other auth methods...
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Fetch user profile once authenticated
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!user,
  });
  
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoadingAuth(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const isLoading = isLoadingAuth || isLoadingProfile;
  
  const login = async (email: string, password: string) => {
    try {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await firebaseAuth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user: profile || null, 
      isLoading, 
      login, 
      logout,
      // Other auth methods...
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Real-Time Data Updates

The platform implements real-time updates using WebSockets and polling:

```typescript
// Simplified WebSocket server in server/index.ts
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { db } from '../db';
import { affiliateStats } from '../db/schema';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Stats cache
let statsCache = null;
let lastCacheTime = 0;

// Broadcast stats to all connected clients
async function broadcastStats() {
  try {
    // Only refetch data if cache is older than 10 seconds
    const now = Date.now();
    if (!statsCache || now - lastCacheTime > 10000) {
      const stats = await db.query.affiliateStats.findMany({
        orderBy: [desc(affiliateStats.totalWager)],
        limit: 50,
        with: {
          user: true
        }
      });
      
      statsCache = stats;
      lastCacheTime = now;
      console.log('Updated stats cache');
    }
    
    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ 
          type: 'stats_update', 
          data: statsCache 
        }));
      }
    });
  } catch (error) {
    console.error('Error broadcasting stats:', error);
  }
}

// Broadcast every 15 seconds
setInterval(broadcastStats, 15000);

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  // Send initial data
  if (statsCache) {
    ws.send(JSON.stringify({ 
      type: 'stats_update', 
      data: statsCache 
    }));
  }
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});
```

## Animation and UI Enhancement

The application uses Framer Motion for animations:

```tsx
// Example from client/src/components/AnimateOnScroll.tsx
import { motion } from 'framer-motion';
import { useIntersectionObserver } from '../hooks/use-intersection-observer';
import { ReactNode, useRef } from 'react';

interface AnimateOnScrollProps {
  children: ReactNode;
  threshold?: number;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const AnimateOnScroll = ({
  children,
  threshold = 0.1,
  delay = 0,
  direction = 'up'
}: AnimateOnScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(ref, { threshold });
  const isVisible = !!entry?.isIntersecting;

  // Set different initial positions based on direction
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 50 };
      case 'down': return { opacity: 0, y: -50 };
      case 'left': return { opacity: 0, x: 50 };
      case 'right': return { opacity: 0, x: -50 };
      default: return { opacity: 0, y: 50 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { opacity: 1, y: 0 };
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 };
      default:
        return { opacity: 1, y: 0 };
    }
  };

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <motion.div
        initial={getInitialPosition()}
        animate={isVisible ? getAnimatePosition() : getInitialPosition()}
        transition={{
          duration: 0.5,
          delay: delay,
          ease: [0.16, 1, 0.3, 1] // Custom ease curve
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
```

## Conclusion

This document provides insight into the implementation details of key components in the Affiliate Marketing Platform. The project combines modern frontend technologies with a robust backend to create a scalable, feature-rich application for affiliate marketing management.