import { Request, Response, NextFunction } from "express";

/**
 * Middleware to handle CORS headers for all routes
 * This will allow requests from any origin in development mode,
 * while being more restrictive in production
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check for the domain making the request
  const origin = req.headers.origin;
  const host = req.headers.host || '';
  
  // First log some debug info about the request
  console.log(`CORS Debug - Request from origin: ${origin || 'none'}, host: ${host}`);
  
  // In Replit environment or development mode, allow all origins
  const isReplitEnv = host.includes('.replit.') || host.includes('.repl.co');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isReplitEnv || isDevelopment) {
    // Allow all origins in Replit or development environments
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    console.log('CORS Debug - Setting permissive CORS headers for development or Replit');
  } else if (origin) {
    // In production, restrict to specific domains
    const allowedOrigins = [
      'https://goatedrewards.com',
      'https://www.goatedrewards.com',
      // Add other allowed domains as needed 
    ];
    
    // Always allow Replit domains in case this runs there
    if (
      origin.includes('.repl.co') || 
      origin.includes('.replit.dev') || 
      origin.includes('.replit.app') ||
      origin.includes('.repl.run') ||
      origin.includes('spock.replit.dev')
    ) {
      console.log('CORS Debug - Allowing Replit domain:', origin);
      allowedOrigins.push(origin);
    }
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      console.log('CORS Debug - Allowing production origin:', origin);
    }
  }

  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}