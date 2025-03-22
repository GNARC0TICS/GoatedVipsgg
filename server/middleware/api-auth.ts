import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { apiKeys, apiKeyUsage } from "../../db/schema/api-keys";

/**
 * API Key Authentication Middleware
 * 
 * This middleware validates API keys for service-to-service authentication,
 * particularly for the standalone Telegram bot to authenticate with
 * the main GoatedVIPs platform.
 * 
 * It checks:
 * 1. If the API key is present in the request header
 * 2. If the API key exists in the database and is active
 * 3. If the API key has not expired
 * 4. If the request IP is in the whitelist (if configured)
 * 5. If the API key has not exceeded its rate limit
 * 
 * If all checks pass, it adds the API key information to the request object
 * and logs the API key usage for auditing and rate limiting purposes.
 */

// Rate limiter for API keys
const apiKeyRateLimiter = new Map<string, { count: number, resetAt: number }>();

// Extend Express Request type to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: any;
    }
  }
}

export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const apiKey = req.headers["x-api-key"] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing API key"
    });
  }
  
  try {
    // Fetch key data from database
    const [keyData] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, apiKey))
      .execute();
    
    if (!keyData || !keyData.isActive) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid API key"
      });
    }
    
    // Check if key is expired
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Expired API key"
      });
    }
    
    // Check IP whitelist if configured
    if (keyData.ipWhitelist) {
      const allowedIps = keyData.ipWhitelist.split(',').map(ip => ip.trim());
      const clientIp = req.ip || req.connection.remoteAddress || '';
      
      if (!allowedIps.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: IP not allowed"
        });
      }
    }
    
    // Check rate limit
    const now = Date.now();
    const rateLimit = keyData.rateLimit || 100; // Default 100 requests per minute
    const keyId = keyData.id.toString();
    
    if (!apiKeyRateLimiter.has(keyId)) {
      apiKeyRateLimiter.set(keyId, {
        count: 1,
        resetAt: now + 60000 // 1 minute
      });
    } else {
      const limiter = apiKeyRateLimiter.get(keyId);
      
      if (limiter && now > limiter.resetAt) {
        // Reset window
        limiter.count = 1;
        limiter.resetAt = now + 60000;
      } else if (limiter && limiter.count >= rateLimit) {
        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          resetAt: new Date(limiter.resetAt)
        });
      } else if (limiter) {
        limiter.count++;
      }
    }
    
    // Add API key info to request for later use
    req.apiKey = keyData;
    
    // Continue with the request
    const originalSend = res.send;
    res.send = function(body) {
      // Log API key usage after request completes
      const responseTime = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 300;
      
      db.insert(apiKeyUsage)
        .values({
          keyId: keyData.id,
          endpoint: req.path,
          method: req.method,
          timestamp: new Date(),
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers["user-agent"],
          success,
          responseTime,
          errorCode: !success ? res.statusCode.toString() : null
        })
        .execute()
        .catch(err => console.error("Error logging API key usage:", err));
      
      // Update last used timestamp
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyData.id))
        .execute()
        .catch(err => console.error("Error updating API key last used:", err));
      
      return originalSend.call(this, body);
    };
    
    next();
  } catch (error) {
    console.error("API key validation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

/**
 * Request Signing Middleware
 * 
 * This middleware validates signed requests for enhanced security.
 * It is used for sensitive operations like admin actions.
 * 
 * It checks:
 * 1. If all required headers are present (API key, timestamp, nonce, signature)
 * 2. If the timestamp is recent (within 5 minutes)
 * 3. If the nonce has not been used before
 * 4. If the signature is valid
 * 
 * If all checks pass, it stores the nonce to prevent replay attacks
 * and allows the request to proceed.
 */
export async function validateSignedRequest(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;
  const timestamp = req.headers["x-timestamp"] as string;
  const nonce = req.headers["x-nonce"] as string;
  const signature = req.headers["x-signature"] as string;
  
  // Check if all required headers are present
  if (!apiKey || !timestamp || !nonce || !signature) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing authentication headers"
    });
  }
  
  try {
    // Fetch API key data
    const [keyData] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, apiKey))
      .execute();
    
    if (!keyData || !keyData.isActive) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid API key"
      });
    }
    
    // Check if timestamp is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    
    if (isNaN(requestTime) || now - requestTime > 300) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Request expired or invalid timestamp"
      });
    }
    
    // Check if nonce has been used before
    const [existingNonce] = await db
      .select()
      .from(usedNonces)
      .where(eq(usedNonces.nonce, nonce))
      .execute();
    
    if (existingNonce) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Nonce already used"
      });
    }
    
    // Store nonce to prevent replay attacks
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db
      .insert(usedNonces)
      .values({
        nonce,
        timestamp: new Date(),
        expiresAt
      })
      .execute();
    
    // Recreate and verify signature
    const method = req.method;
    const path = req.path;
    const body = JSON.stringify(req.body) || '';
    
    const message = `${method}${path}${timestamp}${nonce}${body}`;
    const expectedSignature = createHmac('sha256', keyData.secret)
      .update(message)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid signature"
      });
    }
    
    // Signature is valid, continue
    next();
  } catch (error) {
    console.error("Signature validation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

/**
 * Generate API Key
 * 
 * This function generates a new API key and secret.
 * It is used for creating new API keys for services.
 * 
 * @returns {Object} An object containing the key and secret
 */
export function generateApiKey() {
  const key = randomBytes(32).toString('hex');
  const secret = randomBytes(48).toString('hex');
  
  return { key, secret };
}

/**
 * Create API Key
 * 
 * This function creates a new API key in the database.
 * 
 * @param {string} name - The name of the API key
 * @param {string[]} permissions - The permissions for the API key
 * @param {number} createdBy - The ID of the user creating the API key
 * @returns {Promise<Object>} The created API key
 */
export async function createApiKey(name: string, permissions: string[], createdBy: number) {
  const { key, secret } = generateApiKey();
  
  // Store in database
  const [newKey] = await db
    .insert(apiKeys)
    .values({
      name,
      key,
      secret,
      permissions,
      createdBy,
      createdAt: new Date(),
    })
    .returning();
  
  // Return both key and secret to admin (secret won't be retrievable again)
  return { id: newKey.id, key, secret };
}

// Import necessary modules
import { createHmac, randomBytes } from 'crypto';
import { usedNonces } from '../../db/schema/api-keys';
