/**
 * API client for the Telegram bot
 * Provides standardized API interaction with error handling and retries
 */

import { BotConfig } from './config';

/**
 * Generic API response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  status?: string;
  message?: string;
  error?: string;
}

/**
 * API error categories
 */
export enum ApiErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  AUTH = 'auth',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  UNKNOWN = 'unknown',
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  public type: ApiErrorType;
  public statusCode?: number;
  public response?: Response;

  constructor(message: string, type: ApiErrorType, statusCode?: number, response?: Response) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Retry options for API requests
 */
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  retryOnStatusCodes: number[];
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * API client class
 */
export class ApiClient {
  private timeout: number;
  private retryOptions: RetryOptions;

  /**
   * Create a new API client
   * @param timeout Request timeout in milliseconds
   * @param retryOptions Retry options
   */
  constructor(
    timeout = BotConfig.REQUEST_TIMEOUT,
    retryOptions = DEFAULT_RETRY_OPTIONS
  ) {
    this.timeout = timeout;
    this.retryOptions = retryOptions;
  }

  /**
   * Send a request to the API with retries and error handling
   * @param url API endpoint URL
   * @param options Fetch options
   * @returns Response data
   * @throws ApiError if request fails
   */
  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const signal = controller.signal;

    try {
      return await this.executeWithRetry<T>(
        async () => {
          try {
            const response = await fetch(url, {
              ...options,
              signal,
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });

            const responseData = await this.handleResponse<T>(response);
            return responseData;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              throw new ApiError('Request timed out', ApiErrorType.TIMEOUT);
            }
            
            // Network errors (e.g., no internet)
            if (error instanceof TypeError && error.message.includes('fetch')) {
              throw new ApiError('Network error', ApiErrorType.NETWORK);
            }
            
            throw error;
          }
        },
        this.retryOptions
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle API response with proper error categorization
   * @param response Fetch response
   * @returns Response data
   * @throws ApiError if response is not successful
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Parse JSON response (with fallback for non-JSON responses)
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Non-JSON response
      data = { success: false, message: 'Invalid response format' };
    }

    if (!response.ok) {
      let errorType = ApiErrorType.UNKNOWN;
      let errorMessage = data?.message || data?.error || response.statusText || 'Unknown error';

      // Categorize error based on status code
      switch (response.status) {
        case 400:
          errorType = ApiErrorType.VALIDATION;
          break;
        case 401:
        case 403:
          errorType = ApiErrorType.AUTH;
          break;
        case 404:
          errorType = ApiErrorType.NOT_FOUND;
          break;
        case 408:
          errorType = ApiErrorType.TIMEOUT;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = ApiErrorType.SERVER;
          break;
      }

      throw new ApiError(errorMessage, errorType, response.status, response);
    }

    return data as T;
  }

  /**
   * Execute a fetch operation with retries using exponential backoff
   * @param operation Function to execute
   * @param options Retry options
   * @returns Operation result
   * @throws Error if all retries fail
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = options.initialDelay;

    for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if this is the last attempt
        if (attempt > options.maxRetries) {
          break;
        }
        
        // Don't retry for certain error types
        if (error instanceof ApiError) {
          if (
            error.type === ApiErrorType.VALIDATION ||
            error.type === ApiErrorType.AUTH ||
            error.type === ApiErrorType.NOT_FOUND
          ) {
            break;
          }
          
          // Only retry specific status codes
          if (
            error.statusCode &&
            !options.retryOnStatusCodes.includes(error.statusCode)
          ) {
            break;
          }
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Calculate next delay (exponential backoff with jitter)
        delay = Math.min(
          options.maxDelay,
          delay * options.factor * (0.5 + Math.random())
        );
      }
    }

    // All retries failed
    throw lastError!;
  }

  /**
   * Get stats for a Goated user
   * @param username Goated username
   * @returns User stats
   */
  async getGoatedStats(username: string): Promise<any> {
    const url = new URL(BotConfig.API.STATS);
    url.searchParams.append('username', username);
    
    return this.request(url.toString());
  }

  /**
   * Get current race data
   * @returns Race data
   */
  async getCurrentRace(): Promise<any> {
    return this.request(BotConfig.API.RACES);
  }
}

// Export singleton instance for common use
export const apiClient = new ApiClient();