import { db } from "@db/connection";
import { apiKeys } from "@db/schema/api-keys";
import { eq } from "drizzle-orm";
import { log } from "../vite";
import nodemailer from "nodemailer";

// The key name constant for the Goated.com API token
export const GOATED_API_KEY_NAME = "goated-api-token";

// JWT token interface
interface DecodedToken {
  uid: string;
  session: string;
  iat: number;
  exp: number;
}

/**
 * TokenService class for managing API tokens, particularly the Goated.com API token
 */
export class TokenService {
  private transporter: nodemailer.Transporter;
  
  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Get the current Goated.com API token
   * @returns The current API token or null if none exists
   */
  async getGoatedApiToken(): Promise<string | null> {
    try {
      // First, check environment variable
      if (process.env.GOATED_API_TOKEN) {
        log('Using API token from environment variable');
        return process.env.GOATED_API_TOKEN;
      }
      
      // If not in environment, try database
      const [apiKey] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.name, GOATED_API_KEY_NAME))
        .limit(1);
      
      if (!apiKey || !apiKey.isActive) {
        return null;
      }
      
      // If token is expired, return null
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        log(`API token expired at ${apiKey.expiresAt}`);
        return null;
      }
      
      return apiKey.key;
    } catch (error) {
      log(`Error getting Goated API token: ${error}`);
      return null;
    }
  }
  
  /**
   * Save a new Goated.com API token
   * @param token The token to save
   * @param expirationDate Optional expiration date
   * @returns Success status
   */
  async saveGoatedApiToken(token: string, expirationDate?: Date): Promise<boolean> {
    try {
      // Check if a token already exists
      const [existingToken] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.name, GOATED_API_KEY_NAME))
        .limit(1);
      
      // First, decode the JWT to extract expiration
      const decodedToken = this.decodeJwt(token);
      
      // Use provided expiration or extracted from JWT
      const expiration = expirationDate || (decodedToken?.exp ? new Date(decodedToken.exp * 1000) : undefined);
      
      if (existingToken) {
        // Update existing token
        await db.update(apiKeys)
          .set({
            key: token,
            expiresAt: expiration,
            lastUsedAt: new Date(),
            isActive: true,
            metadata: { 
              decodedInfo: decodedToken || {},
              updatedAt: new Date().toISOString(),
            },
          })
          .where(eq(apiKeys.id, existingToken.id));
      } else {
        // Create new token
        await db.insert(apiKeys).values({
          name: GOATED_API_KEY_NAME,
          key: token,
          secret: "n/a", // Not used for Goated API token
          expiresAt: expiration,
          isActive: true,
          lastUsedAt: new Date(),
          metadata: { 
            decodedInfo: decodedToken || {},
            updatedAt: new Date().toISOString(),
          },
        });
      }
      
      // Schedule token expiration check and notification
      if (expiration) {
        this.scheduleExpirationCheck(expiration);
      }
      
      return true;
    } catch (error) {
      log(`Error saving Goated API token: ${error}`);
      return false;
    }
  }
  
  /**
   * Check if the token is about to expire
   * @returns Object with status and days until expiration
   */
  async checkTokenExpiration(): Promise<{ isExpiring: boolean; daysLeft?: number; isExpired?: boolean }> {
    try {
      // Check if token exists in environment
      if (process.env.GOATED_API_TOKEN) {
        // Parse expiry from environment token
        const decodedToken = this.decodeJwt(process.env.GOATED_API_TOKEN);
        if (decodedToken && decodedToken.exp) {
          const now = new Date();
          const expirationDate = new Date(decodedToken.exp * 1000);
          
          // Check if already expired
          if (expirationDate < now) {
            return { isExpiring: true, isExpired: true, daysLeft: 0 };
          }
          
          // Calculate days until expiration
          const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Consider expiring if less than 5 days left
          return { 
            isExpiring: daysLeft <= 5, 
            daysLeft,
            isExpired: false,
          };
        }
      }
      
      // If not in environment, try database
      const [apiKey] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.name, GOATED_API_KEY_NAME))
        .limit(1);
      
      if (!apiKey || !apiKey.expiresAt) {
        return { isExpiring: false };
      }
      
      const now = new Date();
      const expirationDate = new Date(apiKey.expiresAt);
      
      // Check if already expired
      if (expirationDate < now) {
        return { isExpiring: true, isExpired: true, daysLeft: 0 };
      }
      
      // Calculate days until expiration
      const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Consider expiring if less than 5 days left
      return { 
        isExpiring: daysLeft <= 5, 
        daysLeft,
        isExpired: false,
      };
    } catch (error) {
      log(`Error checking token expiration: ${error}`);
      return { isExpiring: false };
    }
  }
  
  /**
   * Get token metadata including expiration info
   * @returns Token metadata
   */
  async getTokenMetadata(): Promise<any> {
    try {
      // Check if token exists in environment variable first
      if (process.env.GOATED_API_TOKEN) {
        const decodedToken = this.decodeJwt(process.env.GOATED_API_TOKEN);
        const expirationStatus = await this.checkTokenExpiration();
        
        return {
          exists: true,
          source: 'environment',
          created: decodedToken?.iat ? new Date(decodedToken.iat * 1000) : new Date(),
          expiresAt: decodedToken?.exp ? new Date(decodedToken.exp * 1000) : undefined,
          isActive: true,
          ...expirationStatus,
          metadata: {
            decodedInfo: decodedToken || {},
            uid: decodedToken?.uid,
            session: decodedToken?.session
          },
        };
      }
      
      // If not in environment, try database
      const [apiKey] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.name, GOATED_API_KEY_NAME))
        .limit(1);
      
      if (!apiKey) {
        return { exists: false };
      }
      
      const expirationStatus = await this.checkTokenExpiration();
      
      return {
        exists: true,
        source: 'database',
        created: apiKey.createdAt,
        lastUsed: apiKey.lastUsedAt,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        ...expirationStatus,
        metadata: apiKey.metadata,
      };
    } catch (error) {
      log(`Error getting token metadata: ${error}`);
      return { exists: false, error: String(error) };
    }
  }
  
  /**
   * Schedule a check for token expiration
   * @param expirationDate The expiration date to check against
   */
  private scheduleExpirationCheck(expirationDate: Date): void {
    const now = new Date();
    const expirationTime = expirationDate.getTime();
    
    // Calculate when to send notifications (3 days before expiration)
    const notificationTime = expirationTime - (3 * 24 * 60 * 60 * 1000);
    
    // If notification time is in the future, schedule it
    if (notificationTime > now.getTime()) {
      const timeUntilNotification = notificationTime - now.getTime();
      
      setTimeout(() => {
        this.sendExpirationNotification(expirationDate);
      }, timeUntilNotification);
      
      log(`Scheduled token expiration notification for ${new Date(notificationTime).toISOString()}`);
    }
  }
  
  /**
   * Send a notification that the token is about to expire
   * @param expirationDate When the token expires
   */
  private async sendExpirationNotification(expirationDate: Date): Promise<void> {
    try {
      const daysLeft = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      // Get admin emails from environment variable
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      if (adminEmails.length === 0) {
        log('No admin emails configured for token expiration notification');
        return;
      }
      
      const subject = `[IMPORTANT] Goated API Token Expires in ${daysLeft} Days`;
      const html = `
        <h2>Goated API Token Expiration Warning</h2>
        <p>Your Goated.com API token will expire on <strong>${expirationDate.toLocaleString()}</strong> (in ${daysLeft} days).</p>
        <p>Please log in to your Goated.com account, generate a new token, and update it in the GoatedVIPs Admin Dashboard.</p>
        <p>If the token expires, the system will use fallback data, which may not be accurate or up-to-date.</p>
        <p><a href="${process.env.BASE_URL}/admin/api-tokens">Go to API Token Management</a></p>
      `;
      
      // Send emails to all admins
      for (const email of adminEmails) {
        await this.transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email.trim(),
          subject,
          html,
        });
      }
      
      log(`Sent token expiration notification to ${adminEmails.length} admins`);
    } catch (error) {
      log(`Error sending token expiration notification: ${error}`);
    }
  }
  
  /**
   * Decode a JWT token
   * @param token The JWT token to decode
   * @returns Decoded token or null if invalid
   */
  private decodeJwt(token: string): DecodedToken | null {
    try {
      // Simple JWT decoding (without verification)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = parts[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      
      return decoded as DecodedToken;
    } catch (error) {
      log(`Error decoding JWT: ${error}`);
      return null;
    }
  }
}
