/**
 * Creates a debounced version of a function
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a function that will only execute once within a specified time period
 *
 * @param func - The function to throttle
 * @param limit - The time limit in milliseconds
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// In-flight request tracker to prevent duplicate concurrent requests
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Makes an API request with deduplication (prevents multiple identical concurrent requests)
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns The response data
 */
export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const requestKey = `${options?.method || "GET"}-${url}`;

  if (inFlightRequests.has(requestKey)) {
    // Return the existing promise if we're already fetching this resource
    return inFlightRequests.get(requestKey)!;
  }

  // Create new request
  const promise = fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json() as Promise<T>;
    })
    .finally(() => {
      // Remove from in-flight requests when done
      inFlightRequests.delete(requestKey);
    });

  // Store the promise
  inFlightRequests.set(requestKey, promise);

  return promise;
}
