import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/fonts.css";
import "./index.css";

// Helper function to safely access environment variables
const getEnvValue = (key: string, defaultValue: string = '') => {
  try {
    // @ts-ignore - Vite injects import.meta.env
    return import.meta.env[key] || defaultValue;
  } catch (e) {
    console.warn(`Failed to access environment variable: ${key}`);
    return defaultValue;
  }
};

// Expose environment variables to window object for easier access
(window as any).__ENV = {
  VITE_API_BASE_URL: getEnvValue('VITE_API_BASE_URL'),
  NODE_ENV: getEnvValue('MODE', 'development'),
  VITE_ALLOW_CORS: getEnvValue('VITE_ALLOW_CORS', 'true'),
  VITE_ALLOW_REPLIT_DOMAINS: getEnvValue('VITE_ALLOW_REPLIT_DOMAINS', 'true'),
  // Add other environment variables as needed
};

// Log environment info to help with debugging
console.log('⚙️ Environment:', (window as any).__ENV.NODE_ENV);
if ((window as any).__ENV.VITE_API_BASE_URL) {
  console.log('🔌 API Base URL configured:', (window as any).__ENV.VITE_API_BASE_URL);
} else {
  console.log('🔌 Using default API URL (same origin)');
}

console.log('🛡️ CORS settings:', {
  allowCORS: (window as any).__ENV.VITE_ALLOW_CORS === 'true',
  allowReplitDomains: (window as any).__ENV.VITE_ALLOW_REPLIT_DOMAINS === 'true',
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
