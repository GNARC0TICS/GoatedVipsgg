import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

/**
 * Middleware to handle domain-based routing
 * Routes goombas.net to admin interfaces
 * Routes goatedvips.gg (and others) to public interfaces
 */
export function domainRouter(req: Request, res: Response, next: NextFunction) {
  const host = req.hostname || '';
  const adminDomain = process.env.ADMIN_DOMAIN || 'goombas.net';
  const isAdminDomain = host === adminDomain || host.startsWith(`${adminDomain}:`);
  
  // Set a flag in the request object to indicate whether this is an admin domain request
  (req as any).isAdminDomain = isAdminDomain;
  
  // Log domain routing in development mode
  if (process.env.NODE_ENV !== 'production') {
    log(`Domain routing: ${host} -> ${isAdminDomain ? 'Admin' : 'Public'} interface`);
  }
  
  // If it's an admin domain and not already accessing admin routes
  if (isAdminDomain && !req.path.startsWith('/admin') && !req.path.startsWith('/api/admin')) {
    // For API requests to admin domain, redirect to admin API
    if (req.path.startsWith('/api/')) {
      return res.redirect(`/api/admin${req.path.substring(4)}`);
    }
    
    // For non-API admin domain requests that aren't already to admin paths
    // If it's a page request (not a static asset), redirect to admin dashboard
    if (!req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      return res.redirect('/admin/dashboard');
    }
  }
  
  // Pass control to the next middleware
  next();
}
