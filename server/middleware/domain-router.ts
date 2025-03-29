import { Request, Response, NextFunction } from "express";

/**
 * Middleware to handle routing specific domains to different handlers
 * This is useful when running in Replit environment where multiple domains
 * might point to the same service
 */
export function domainRouter(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  
  // Debug logging
  console.log(`Domain Router - Request info:
    - Host: ${host}
    - Origin: ${origin}
    - Referer: ${referer}
    - Path: ${req.path}
    - Method: ${req.method}
  `);
  
  // Set a flag to indicate if this is an admin domain
  const isAdminDomain = host.includes('admin.') || host.includes('-admin');
  req.isAdminDomain = isAdminDomain;
  
  // Set a flag to indicate if this is a Replit domain
  const isReplitDomain = host.includes('.replit.') || 
                          host.includes('.repl.co') || 
                          host.includes('spock.replit.dev');
  req.isReplitDomain = isReplitDomain;
  
  // Log the request info for debugging
  console.log(`Request from ${host} (isAdminDomain: ${isAdminDomain}) to ${req.path}`);
  
  next();
}

/**
 * Middleware to restrict routes to admin domains only
 */
export function requireAdminDomain(req: Request, res: Response, next: NextFunction) {
  if (req.isAdminDomain) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Access denied. This endpoint is restricted to admin domains only.'
  });
}

/**
 * Middleware to prevent admin-only routes from being accessed from non-admin domains
 */
export function preventAdminDomain(req: Request, res: Response, next: NextFunction) {
  if (req.isAdminDomain) {
    return res.status(403).json({
      status: 'error',
      message: 'This endpoint is not available on admin domains.'
    });
  }
  
  return next();
}

// Add custom properties to Express Request
declare global {
  namespace Express {
    interface Request {
      isAdminDomain?: boolean;
      isReplitDomain?: boolean;
    }
  }
}