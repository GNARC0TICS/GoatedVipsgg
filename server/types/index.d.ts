declare module 'cookie-parser';

// Extending Express types only where needed
import { Request, Response, NextFunction } from 'express';

// Add custom properties to Request interface
declare global {
  namespace Express {
    interface Request {
      // Add any custom properties here
    }
  }
}