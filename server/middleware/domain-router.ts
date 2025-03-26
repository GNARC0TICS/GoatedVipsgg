import { Request, Response, NextFunction } from "express";
import { log } from "../vite";

// Define domain configurations
const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || "goombas.net";
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || "goatedvips.com";

/**
 * Middleware to handle routing based on hostname
 * 
 * This middleware checks the hostname of the request and handles routing accordingly:
 * - Requests to goombas.net are directed to admin routes
 * - All other requests access the standard application
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Next middleware function
 */
export function domainRouter(req: Request, res: Response, next: NextFunction) {
  const hostname = req.hostname;
  
  // Store the domain type in the request for use in other middleware/routes
  (req as any).isAdminDomain = hostname === ADMIN_DOMAIN || 
                               hostname.startsWith(`${ADMIN_DOMAIN}.`);
  
  log(`Request from ${hostname} (isAdminDomain: ${(req as any).isAdminDomain})`);
  
  // Let the request continue - route handling will be done in the routes
  next();
}

/**
 * Middleware to require admin domain for specific routes
 * Redirects to admin domain if accessed from non-admin domain
 */
export function requireAdminDomain(req: Request, res: Response, next: NextFunction) {
  const hostname = req.hostname;
  
  if ((req as any).isAdminDomain) {
    // We're on the admin domain, proceed
    return next();
  }
  
  // We're not on the admin domain, redirect to admin domain
  const protocol = req.secure ? 'https' : 'http';
  return res.redirect(`${protocol}://${ADMIN_DOMAIN}${req.originalUrl}`);
}

/**
 * Middleware to prevent access to regular app routes from admin domain
 * Redirects to main domain if accessed from admin domain
 */
export function preventAdminDomain(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).isAdminDomain) {
    // We're not on the admin domain, proceed
    return next();
  }
  
  // We're on the admin domain but trying to access non-admin routes
  // Use the configured main domain
  const protocol = req.secure ? 'https' : 'http';
  
  return res.redirect(`${protocol}://${MAIN_DOMAIN}${req.originalUrl}`);
}