declare module 'passport';
declare module 'passport-local';
declare module 'express';
declare module 'express-session';
declare module 'drizzle-orm';
declare module 'rate-limiter-flexible';
declare module 'resend';

// Augmenting Express to add a User type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      isAdmin?: boolean;
      email: string;
      createdAt?: Date;
    }
  }
}

export {}; 