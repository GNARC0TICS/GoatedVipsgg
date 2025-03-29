import fetch, { RequestInit } from "node-fetch";
import { API_CONFIG } from "../config/api";
import { log } from "../vite";
import { APIResponse, LeaderboardData } from "../../client/src/types/api";

class APIRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'APIRequestError';
  }
}

/**
 * API service for interacting with the Goated.com API
 */
class ApiService {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly endpoints: Record<string, string>;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.token = API_CONFIG.goatedToken;
    this.endpoints = API_CONFIG.endpoints;
  }

  /**
   * Get the full URL for an endpoint
   * @param endpoint The endpoint name defined in API_CONFIG
   * @returns The full URL
   */
  private getUrl(endpoint: string): string {
    const path = this.endpoints[endpoint];
    if (!path) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    return `${this.baseUrl}${path}`;
  }

  /**
   * Make a request to the Goated.com API
   * @param endpoint The endpoint name defined in API_CONFIG
   * @param options Additional fetch options
   * @returns The API response data
   * @throws {APIRequestError} When the request fails
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    const url = this.getUrl(endpoint);
    
    try {
      // Create headers with proper typing
      const headers = {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
      };
      
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        log(`API error (${response.status}): ${errorText}`);
        throw new APIRequestError(
          errorText || `Request failed with status ${response.status}`,
          response.status,
          endpoint
        );
      }

      const data = await response.json();
      return {
        status: "success",
        data: data as T
      };
    } catch (error) {
      if (error instanceof APIRequestError) {
        throw error;
      }
      
      log(`API request error for ${endpoint}: ${error}`);
      throw new APIRequestError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        endpoint
      );
    }
  }

  /**
   * Get leaderboard data from Goated.com API
   * @returns Leaderboard data
   * @throws {APIRequestError} When the request fails
   */
  async getLeaderboardData(): Promise<APIResponse<LeaderboardData>> {
    return this.request<LeaderboardData>('leaderboard');
  }

  /**
   * Check API health
   * @returns Health check response
   * @throws {APIRequestError} When the request fails
   */
  async checkHealth(): Promise<APIResponse<{ status: string }>> {
    return this.request<{ status: string }>('health');
  }
}

export const apiService = new ApiService();
