/**
 * Authorization utilities for the Telegram bot
 * Implements secure role-based access control
 */

import type { Message } from 'node-telegram-bot-api';

// Extract admin IDs from environment variables with fallback
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
const MOD_TELEGRAM_IDS = (process.env.MOD_TELEGRAM_IDS || '').split(',').filter(Boolean);
const ALLOWED_GROUP_IDS = (process.env.ALLOWED_GROUP_IDS || '').split(',').filter(Boolean);

/**
 * Role-based permission system
 */
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * Check if a user is an admin based on their Telegram ID
 * @param userId Telegram user ID to check
 * @returns boolean indicating if user is an admin
 */
export function isAdmin(userId?: number): boolean {
  if (!userId) return false;
  return ADMIN_TELEGRAM_IDS.includes(userId.toString());
}

/**
 * Check if a user is a moderator based on their Telegram ID
 * @param userId Telegram user ID to check
 * @returns boolean indicating if user is a moderator
 */
export function isModerator(userId?: number): boolean {
  if (!userId) return false;
  return MOD_TELEGRAM_IDS.includes(userId.toString()) || isAdmin(userId);
}

/**
 * Check if the chat is an allowed group
 * @param chatId Telegram chat ID to check
 * @returns boolean indicating if chat is an allowed group
 */
export function isAllowedGroup(chatId?: number): boolean {
  if (!chatId) return false;
  return ALLOWED_GROUP_IDS.includes(chatId.toString());
}

/**
 * Get the role of a user based on their Telegram ID
 * @param userId Telegram user ID to check
 * @returns UserRole enum value representing the user's role
 */
export function getUserRole(userId?: number): UserRole {
  if (!userId) return UserRole.GUEST;
  if (isAdmin(userId)) return UserRole.ADMIN;
  if (isModerator(userId)) return UserRole.MODERATOR;
  return UserRole.USER;
}

/**
 * Check if a Telegram message is from an admin
 * @param msg Telegram message object
 * @returns boolean indicating if message is from an admin
 */
export function isAdminMessage(msg: Message): boolean {
  return isAdmin(msg.from?.id);
}

/**
 * Check if a Telegram message is from a moderator
 * @param msg Telegram message object
 * @returns boolean indicating if message is from a moderator
 */
export function isModeratorMessage(msg: Message): boolean {
  return isModerator(msg.from?.id);
}

/**
 * Check if a message was sent in an allowed group
 * @param msg Telegram message object
 * @returns boolean indicating if message is from an allowed group
 */
export function isAllowedGroupMessage(msg: Message): boolean {
  return isAllowedGroup(msg.chat.id);
}

/**
 * Verify if the current configuration is valid
 * Throws an error if the configuration is invalid
 * @throws Error if admin IDs are missing
 */
export function verifyAuthConfiguration(): void {
  if (ADMIN_TELEGRAM_IDS.length === 0) {
    console.warn('[Auth] Warning: No admin Telegram IDs configured. Set ADMIN_TELEGRAM_IDS env variable.');
  }
  
  if (ALLOWED_GROUP_IDS.length === 0) {
    console.warn('[Auth] Warning: No allowed group IDs configured. Set ALLOWED_GROUP_IDS env variable.');
  }
}