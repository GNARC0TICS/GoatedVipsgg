/**
 * Configuration management for the Telegram bot
 * Centralizes all configuration settings with validation
 */

// Base API URL - defaulting to the application server if not specified
const BASE_API_URL = process.env.API_BASE_URL || "http://0.0.0.0:5000";

/**
 * Bot configuration settings
 */
export const BotConfig = {
  // Telegram bot token
  TOKEN: process.env.TELEGRAM_BOT_TOKEN,

  // API endpoints
  API: {
    STATS: `${BASE_API_URL}/api/affiliate/stats`,
    RACES: `${BASE_API_URL}/api/wager-races/current`,
    USERS: `${BASE_API_URL}/api/users`,
    VERIFICATION: `${BASE_API_URL}/api/verification`,
    CHALLENGES: `${BASE_API_URL}/api/challenges`,
  },

  // Bot behavior settings
  CONVERSATION_COOLDOWN: 10000, // 10 seconds between AI responses
  POLLING_RESTART_DELAY: 5000, // 5 seconds before restarting polling after error
  REQUEST_TIMEOUT: 30000, // 30 seconds timeout for API requests

  // Links
  WEBSITE_URL: "https://goatedvips.gg",
  PLAY_URL: "https://goated.com",

  // Support contact
  SUPPORT_USERNAME: process.env.SUPPORT_USERNAME || "xGoombas",
};

/**
 * Message templates for common responses
 */
export const MessageTemplates = {
  ERRORS: {
    UNAUTHORIZED: "❌ You do not have permission to use this command.",
    NOT_FOUND: "❌ The requested information could not be found.",
    SERVER_ERROR:
      "❌ An error occurred while processing your request. Please try again later.",
    VALIDATION_ERROR:
      "❌ Invalid input. Please check your command format and try again.",
    TIMEOUT: "❌ The request timed out. Please try again later.",
    USER_NOT_FOUND:
      "❌ Could not identify your user account. Please try again.",
  },

  SUCCESS: {
    VERIFICATION: "✅ Your account has been successfully verified!",
    COMMAND_EXECUTED: "✅ Command executed successfully.",
  },
};

/**
 * Begging detection patterns
 */
export const BEGGING_PATTERNS = {
  DIRECT: [
    "give me",
    "send me",
    "need money",
    "spare some",
    "can send?",
    "sen pls",
    "pls send",
    "send pls",
    "send coin",
    "gimme",
    "hook me up",
    "need help$",
  ],
  SUBTLE: [
    "broke",
    "poor",
    "help me out",
    "anything helps",
    "no money",
    "struggling",
    "desperate",
  ],
  SPAM: [
    "copy paste",
    "forwarded message",
    "chain message",
    "spam",
    "bulk message",
  ],
  SHARING: ["airdrop", "giveaway", "sharing", "giving away", "drop", "contest"],
} as const;

/**
 * Warning messages for begging
 */
export const BEGGING_WARNINGS = [
  "⚠️ @{username} Begging is not allowed in this group. Focus on participating in races and events instead!",
  "⚠️ Hey @{username}, we don't allow begging here. Try joining our monthly races to earn rewards!",
  "⚠️ @{username} This is a warning for begging. Join the community events instead of asking for handouts!",
  "⚠️ @{username} No begging allowed! Check /help to see how you can earn through races and challenges!",
] as const;

/**
 * Bot personality traits for message generation
 */
export const BOT_PERSONALITY = {
  FRIENDLY: ["Hey!", "Hi there!", "Hello!", "Sup!"],
  HELPFUL: [
    "Let me help you with that!",
    "I can assist with that!",
    "I got you!",
  ],
  PLAYFUL: ["😎", "🎮", "🎲"],
  CONGRATULATORY: ["Well done!", "Amazing!", "Great job!", "Fantastic!"],
} as const;

/**
 * Validate the bot configuration
 * @returns True if configuration is valid, false otherwise
 */
export function validateConfig(): boolean {
  if (!BotConfig.TOKEN) {
    console.error("[Config] TELEGRAM_BOT_TOKEN is not set");
    return false;
  }

  if (!BASE_API_URL) {
    console.warn("[Config] API_BASE_URL is not set, using default");
  }

  return true;
}
