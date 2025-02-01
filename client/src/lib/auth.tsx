import { createContext, useContext, useState } from 'react';
import type { SelectUser } from '@db/schema';

interface AuthContextType {
  user: SelectUser | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (credentials: { username: string; password: string; email: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SelectUser | null>(null);

  const login = async (credentials: { username: string; password: string }) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();
    setUser(data.user);
    localStorage.setItem('token', data.token);
  };

  const register = async (credentials: { username: string; password: string; email: string }) => {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      throw new Error('Registration failed');
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}