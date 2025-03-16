
import { logger } from './logger';

interface Session {
  userId: string;
  startTime: number;
  lastActivity: number;
  commandCount: number;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly RATE_LIMIT = 30; // commands per minute
  
  constructor() {
    // Cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);
  }

  createSession(userId: string): Session {
    const session: Session = {
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      commandCount: 0
    };
    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId: string): Session {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.createSession(userId);
    }
    return session;
  }

  updateActivity(userId: string): boolean {
    const session = this.getSession(userId);
    const now = Date.now();
    
    // Reset command count if more than a minute has passed
    if (now - session.lastActivity > 60000) {
      session.commandCount = 0;
    }
    
    // Check rate limit
    if (session.commandCount >= this.RATE_LIMIT) {
      logger.warn('Rate limit exceeded', { userId });
      return false;
    }
    
    session.lastActivity = now;
    session.commandCount++;
    return true;
  }

  private cleanupSessions() {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(userId);
        logger.info('Session expired', { userId });
      }
    }
  }
}

export const sessionManager = new SessionManager();
