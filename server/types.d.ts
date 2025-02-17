import { WebSocket } from 'ws';
import { Session } from 'express-session';

declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
}

declare module 'express-session' {
  interface SessionData {
    initialized: boolean;
    isAnonymous: boolean;
    userId?: number;
    telegramId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      session: Session & SessionData;
    }
    interface Response {
      originalJson?: Response['json'];
    }
  }
}
