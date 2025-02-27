// useUser.ts or similar hook file

import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  // ... other user properties
  role: string;
}

const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing user in local storage (or similar persistent storage)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = async (credentials: { username: string; password: string }, isAdmin = false) => {
    try {
      const endpoint = isAdmin ? "/api/admin/login" : "/api/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user)); //Persist user data
        return { status: "success", user: data.user };
      } else {
        setError(data.message);
        return { status: "error", message: data.message };
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred");
      return { 
        status: "error", 
        message: "An unexpected error occurred" 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return { user, isLoading, error, login, logout };
};

export default useUser;