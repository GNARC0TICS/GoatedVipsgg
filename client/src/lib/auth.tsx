import { requiresAuth } from './protected-route';
import { useUser } from '@/hooks/use-user';

// Re-export the auth utilities for consistency
export { requiresAuth, useUser as useAuth };