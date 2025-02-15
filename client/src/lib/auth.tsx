<replit_final_file>
import React, { useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { SelectUser } from "@db/schema";
import { useAuth as useBaseAuth } from "@/hooks/use-auth";

// Protected routes that require authentication
export const PROTECTED_ROUTES = [
  '/bonus-codes',
  '/notification-preferences',
  '/user/',
  '/admin/',
];

// Helper function to check if a route requires authentication
export function requiresAuth(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route));
}

// Re-export the main auth hook
export const useAuth = useBaseAuth;