import React from 'react';
import { Link } from '../ui/Link';

/**
 * Not Found (404) page component
 * Displayed when a user tries to access a non-existent route
 */
export const NotFound: React.FC = () => {
  return (
    <div className="not-found-container flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        className="bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
};