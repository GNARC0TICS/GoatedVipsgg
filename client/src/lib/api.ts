/**
 * API client for making requests to the backend
 * Handles base URL, authentication, and CORS
 */

// Debug mode for API client
const DEBUG_API = true;

// Function to log debug info
function debugLog(...args: any[]) {
  if (DEBUG_API) {
    console.log('[API Client]', ...args);
  }
}

// Get the API base URL, prioritizing current hostname in Replit environment
function getApiBaseUrl(): string {
  try {
    // First check for explicitly set API URL
    const configuredUrl = (window as any).__ENV?.VITE_API_BASE_URL;
    if (configuredUrl && configuredUrl.length > 0) {
      debugLog('Using configured API URL:', configuredUrl);
      return configuredUrl;
    }
    
    // In Replit environment, default to using the same hostname (Avoids CORS issues)
    const isReplitHost = window.location.hostname.includes('.replit.') || 
                          window.location.hostname.includes('.repl.co') ||
                          window.location.hostname.includes('replit.dev');
    
    if (isReplitHost) {
      const replitApiUrl = `${window.location.protocol}//${window.location.host}`;
      debugLog('Replit environment detected. Using same-origin API URL:', replitApiUrl);
      return replitApiUrl;
    }
    
    // Default fallback - use relative URLs that get resolved against current origin
    debugLog('Using relative API URLs (current origin)');
    return '';
  } catch (e) {
    console.error('Error determining API base URL:', e);
    return '';
  }
}

// Store the computed API base URL
const API_BASE_URL = getApiBaseUrl();
debugLog('Initialized with API base URL:', API_BASE_URL);

/**
 * Creates a full URL for the API by combining the base URL with the endpoint
 * If the endpoint starts with http(s)://, it will be returned as is.
 * Otherwise, it will be prefixed with the base URL.
 */
export function createApiUrl(endpoint: string): string {
  // Remove any double slashes in the endpoint (except http://)
  const cleanEndpoint = endpoint.replace(/([^:])\/\//g, '$1/');
  
  // If endpoint already starts with http(s):// or the base URL, return as is
  if (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://')) {
    return cleanEndpoint;
  }
  
  // Ensure we always have a leading slash on the endpoint
  const normalizedEndpoint = cleanEndpoint.startsWith('/') 
    ? cleanEndpoint 
    : `/${cleanEndpoint}`;
  
  // If we don't have a base URL (using relative URLs), just return the endpoint
  if (!API_BASE_URL) {
    return normalizedEndpoint;
  }
  
  // Combine base URL with endpoint, avoiding double slashes
  const baseWithoutTrailingSlash = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
    
  const fullUrl = `${baseWithoutTrailingSlash}${normalizedEndpoint}`;
  debugLog('Created API URL:', fullUrl, 'from endpoint:', endpoint);
  return fullUrl;
}

/**
 * Fetches data from the API with proper error handling and CORS support
 * @param endpoint - API endpoint (path only, the base URL will be prepended)
 * @param options - Fetch options
 * @returns Promise with response data
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    // Create the full URL
    const url = createApiUrl(endpoint);
    debugLog(`Fetching from ${url}`);
    
    // Default options with credentials and CORS settings
    const defaultOptions: RequestInit = {
      credentials: 'include', // Include cookies with requests
      mode: 'cors', // Enable CORS mode
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    };
    
    // Merge defaultOptions with provided options
    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options?.headers || {}),
      },
    };
    
    debugLog('Request options:', fetchOptions);
    
    // Make the request
    const response = await fetch(url, fetchOptions);
    debugLog(`Response from ${url}:`, response.status, response.statusText);
    
    // Check for error response
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        debugLog('Error response data:', errorData);
      } catch (e) {
        // If response is not JSON, use text
        try {
          errorMessage = await response.text() || errorMessage;
          debugLog('Error response text:', errorMessage);
        } catch (textError) {
          debugLog('Could not parse error response as text:', textError);
        }
      }
      throw new Error(errorMessage);
    }
    
    // Parse JSON response
    const data = await response.json();
    debugLog('Successful response data:', data);
    return data as T;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}