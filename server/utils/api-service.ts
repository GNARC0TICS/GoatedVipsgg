import fetch, { RequestInit } from "node-fetch";
import { API_CONFIG } from "../config/api";
import { log } from "../vite";

/**
 * API service for interacting with the Goated.com API
 */
class ApiService {
  private baseUrl: string;
  private token: string;
  private endpoints: Record<string, string>;

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
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = this.getUrl(endpoint);
      
      // Create headers with proper typing
      const headers = {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      };
      
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        log(`API error (${response.status}): ${errorText}`);
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json() as T;
    } catch (error) {
      log(`API request error: ${error}`);
      throw error;
    }
  }

  /**
   * Get leaderboard data from Goated.com API
   * @returns Leaderboard data
   */
  async getLeaderboardData(): Promise<any> {
    return this.request('leaderboard');
  }

  /**
   * Check API health
   * @returns Health check response
   */
  async checkHealth(): Promise<any> {
    return this.request('health');
  }
}

export const apiService = new ApiService();
