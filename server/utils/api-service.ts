import { log } from "../vite";
import { TokenService } from "./token-service";
import { getFallbackLeaderboardData } from "./fallback-data";
import { API_CONFIG } from "../config/api";

/**
 * API request options type
 */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  useToken?: boolean;
  retries?: number;
}

/**
 * API Service for handling all external API requests with token management
 */
export class ApiService {
  private tokenService: TokenService;
  private currentToken: string | null = null;
  private lastTokenCheck = 0;
  private tokenCheckInterval = 60000; // Check token freshness every minute
  
  constructor() {
    this.tokenService = new TokenService();
    // Initialize token
    this.refreshToken();
  }
  
  /**
   * Make a request to the external API
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Response data
   */
  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    // Check if token needs refreshing
    await this.checkAndRefreshToken();
    
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 10000,
      useToken = true,
      retries = 2
    } = options;
    
    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    
    // Add authorization header if token is available and required
    if (useToken && this.currentToken) {
      requestHeaders['Authorization'] = `Bearer ${this.currentToken}`;
    }
    
    // Build full URL
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${API_CONFIG.baseUrl}${endpoint}`;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Prepare request
      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal
      };
      
      // Add body for non-GET requests
      if (method !== 'GET' && body) {
        requestOptions.body = JSON.stringify(body);
      }
      
      // Make the request
      const response = await fetch(url, requestOptions);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle non-2xx responses
      if (!response.ok) {
        // Try to get more detailed error info
        let errorInfo: any = { status: response.status };
        try {
          errorInfo = await response.json();
        } catch {}
        
        throw new Error(`API request failed: ${response.status} - ${JSON.stringify(errorInfo)}`);
      }
      
      // Parse and return response
      return await response.json() as T;
    } catch (error) {
      // Clear timeout if there was an error
      clearTimeout(timeoutId);
      
      // Check if we should retry
      if (retries > 0) {
        log(`API request failed, retrying (${retries} retries left): ${error}`);
        return this.request<T>(endpoint, { ...options, retries: retries - 1 });
      }
      
      // Throw error if no retries left
      log(`API request failed after retries: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get leaderboard data from the API
   * @param forceRefresh Whether to force a refresh and bypass cache
   * @returns Leaderboard data or fallback data if the request fails
   */
  async getLeaderboardData(forceRefresh = false): Promise<any> {
    try {
      return await this.request(API_CONFIG.endpoints.leaderboard);
    } catch (error) {
      log(`Error fetching leaderboard data, using fallback: ${error}`);
      // We don't pass any cached data here as that's handled by the leaderboard-cache.ts
      // This just passes the error up to the caller
      throw error;
    }
  }
  
  /**
   * Check if the token needs refreshing and refresh if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    const now = Date.now();
    
    // Only check token every minute to avoid too many DB queries
    if (now - this.lastTokenCheck < this.tokenCheckInterval && this.currentToken) {
      return;
    }
    
    this.lastTokenCheck = now;
    await this.refreshToken();
  }
  
  /**
   * Refresh the API token from the database
   */
  private async refreshToken(): Promise<void> {
    try {
      const token = await this.tokenService.getGoatedApiToken();
      
      if (token) {
        this.currentToken = token;
        log(`API token refreshed from database`);
      } else {
        // If no token is found or it's expired, log the issue
        log(`No valid API token found in database`);
        this.currentToken = null;
      }
    } catch (error) {
      log(`Error refreshing API token: ${error}`);
      // Keep using the current token if refresh fails
    }
  }
}

/**
 * Create a singleton instance of the API service
 */
export const apiService = new ApiService();
