const API_BASE_URL = `http://0.0.0.0:3001/api`;

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      console.error(`API Error (${url}):`, error);
      throw new Error(error.message || 'Failed to fetch data');
    }

    const data = await response.json();
    console.log(`API Success (${url}):`, data);
    return data;
  } catch (error) {
    console.error(`API Request Failed (${url}):`, error);
    throw error;
  }
}