import React, { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link } from '../ui/Link';
import { usePreventRefresh } from '../../hooks/usePreventRefresh';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Use the custom hook to prevent unwanted refreshes
  usePreventRefresh();
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-container">
        <header className="app-header">
          <nav className="main-nav">
            <div className="nav-links">
              <Link to="/" activeClass="active">Home</Link>
              <Link to="/dashboard" activeClass="active">Dashboard</Link>
              {/* Add more nav links as needed */}
            </div>
          </nav>
        </header>

        <main className="app-content">
          {children}
        </main>

        <footer className="app-footer">
          <p>© {new Date().getFullYear()} Goated</p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}