/**
 * State management for the Telegram bot
 * Provides a centralized way to manage and persist bot state
 */

import { logger } from "./logger";
import { Job } from "node-schedule";
import { db } from "@db";
import { telegramBotState } from "../../../db/schema/telegram";
import { eq } from "drizzle-orm";

/**
 * Interface for recurring message configuration
 */
export interface RecurringMessage {
  id: string;
  message: string;
  schedule: string;
  chatId: number;
  enabled: boolean;
  targetGroups: string[];
  lastRun?: Date;
}

/**
 * Interface for active chat tracking
 */
export interface ChatState {
  lastMessage: string;
  timestamp: number;
}

/**
 * Interface for persisted state data
 */
interface PersistedState {
  recurringMessages: Record<string, RecurringMessage>;
  userStates: Record<string, Record<string, any>>;
}

/**
 * Bot state manager singleton
 */
class BotStateManager {
  private scheduledJobs: Map<string, Job>;
  private recurringMessages: Map<string, RecurringMessage>;
  private activeChats: Map<number, ChatState>;
  private userStates: Map<number, Record<string, any>>;
  private isInitialized: boolean = false;

  /**
   * Initialize the state manager
   */
  constructor() {
    this.scheduledJobs = new Map();
    this.recurringMessages = new Map();
    this.activeChats = new Map();
    this.userStates = new Map();

    logger.info("BotStateManager initialized");
  }

  /**
   * Initialize state from database
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadState();
      this.isInitialized = true;
      logger.info("Bot state loaded from database");
    } catch (error) {
      logger.error("Failed to load bot state from database", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load state from database
   * Loads critical bot state from the database
   */
  async loadState(): Promise<void> {
    try {
      // Get state from database
      const state = await db
        .select()
        .from(telegramBotState)
        .where(eq(telegramBotState.id, "main"))
        .execute();

      if (state.length === 0) {
        logger.info("No saved state found in database");
        return;
      }

      const persistedState = state[0].data as unknown as PersistedState;

      // Restore recurring messages
      if (persistedState.recurringMessages) {
        Object.entries(persistedState.recurringMessages).forEach(
          ([id, message]) => {
            this.recurringMessages.set(id, message);
          },
        );
      }

      // Restore user states
      if (persistedState.userStates) {
        Object.entries(persistedState.userStates).forEach(
          ([userIdStr, state]) => {
            const userId = parseInt(userIdStr, 10);
            if (!isNaN(userId)) {
              this.userStates.set(userId, state);
            }
          },
        );
      }

      logger.info("Bot state loaded from database");
    } catch (error) {
      logger.error("Failed to load bot state from database", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a scheduled job by ID
   * @param id Job ID
   * @returns The scheduled job or undefined if not found
   */
  getJob(id: string): Job | undefined {
    return this.scheduledJobs.get(id);
  }

  /**
   * Set a scheduled job
   * @param id Job ID
   * @param job Scheduled job
   */
  setJob(id: string, job: Job): void {
    this.scheduledJobs.set(id, job);
  }

  /**
   * Remove a scheduled job
   * @param id Job ID
   * @returns True if the job was removed, false otherwise
   */
  removeJob(id: string): boolean {
    const job = this.scheduledJobs.get(id);
    if (job) {
      job.cancel();
      return this.scheduledJobs.delete(id);
    }
    return false;
  }

  /**
   * Get all scheduled jobs
   * @returns Map of all scheduled jobs
   */
  getAllJobs(): Map<string, Job> {
    return this.scheduledJobs;
  }

  /**
   * Get a recurring message by ID
   * @param id Message ID
   * @returns The recurring message or undefined if not found
   */
  getRecurringMessage(id: string): RecurringMessage | undefined {
    return this.recurringMessages.get(id);
  }

  /**
   * Set a recurring message
   * @param id Message ID
   * @param message Recurring message
   */
  setRecurringMessage(id: string, message: RecurringMessage): void {
    this.recurringMessages.set(id, message);
  }

  /**
   * Remove a recurring message
   * @param id Message ID
   * @returns True if the message was removed, false otherwise
   */
  removeRecurringMessage(id: string): boolean {
    return this.recurringMessages.delete(id);
  }

  /**
   * Get all recurring messages
   * @returns Map of all recurring messages
   */
  getAllRecurringMessages(): Map<string, RecurringMessage> {
    return this.recurringMessages;
  }

  /**
   * Get the state of an active chat
   * @param chatId Chat ID
   * @returns The chat state or undefined if not found
   */
  getChatState(chatId: number): ChatState | undefined {
    return this.activeChats.get(chatId);
  }

  /**
   * Set the state of an active chat
   * @param chatId Chat ID
   * @param state Chat state
   */
  setChatState(chatId: number, state: ChatState): void {
    this.activeChats.set(chatId, state);
  }

  /**
   * Remove an active chat
   * @param chatId Chat ID
   * @returns True if the chat was removed, false otherwise
   */
  removeChatState(chatId: number): boolean {
    return this.activeChats.delete(chatId);
  }

  /**
   * Get all active chats
   * @returns Map of all active chats
   */
  getAllChatStates(): Map<number, ChatState> {
    return this.activeChats;
  }

  /**
   * Get user-specific state
   * @param userId User ID
   * @returns User state or empty object if not found
   */
  getUserState(userId: number): Record<string, any> {
    return this.userStates.get(userId) || {};
  }

  /**
   * Set user-specific state
   * @param userId User ID
   * @param state User state
   */
  setUserState(userId: number, state: Record<string, any>): void {
    this.userStates.set(userId, state);
  }

  /**
   * Update user-specific state (partial update)
   * @param userId User ID
   * @param update State update
   */
  updateUserState(userId: number, update: Record<string, any>): void {
    const currentState = this.getUserState(userId);
    this.userStates.set(userId, { ...currentState, ...update });
  }

  /**
   * Remove user-specific state
   * @param userId User ID
   * @returns True if the state was removed, false otherwise
   */
  removeUserState(userId: number): boolean {
    return this.userStates.delete(userId);
  }

  /**
   * Clean up stale data
   * Removes inactive chats and expired jobs
   */
  cleanupStaleData(): void {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes

    // Clean up inactive chats
    this.activeChats.forEach((state, chatId) => {
      if (now - state.timestamp > inactivityThreshold) {
        this.activeChats.delete(chatId);
      }
    });

    logger.info(`Cleaned up stale data`);
  }

  /**
   * Cancel all scheduled jobs
   */
  cancelAllJobs(): void {
    this.scheduledJobs.forEach((job) => {
      job.cancel();
    });
    this.scheduledJobs.clear();

    logger.info("All scheduled jobs cancelled");
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.cancelAllJobs();
    this.recurringMessages.clear();
    this.activeChats.clear();
    this.userStates.clear();

    logger.info("State manager reset");
  }

  /**
   * Save state to database
   * Saves critical bot state to the database for persistence
   */
  async saveState(): Promise<void> {
    try {
      // Save recurring messages
      const recurringMessagesData: Record<string, RecurringMessage> = {};
      this.recurringMessages.forEach((message, id) => {
        recurringMessagesData[id] = message;
      });

      // Save user states (convert Map to object)
      const userStatesData: Record<string, Record<string, any>> = {};
      this.userStates.forEach((state, userId) => {
        userStatesData[userId.toString()] = state;
      });

      // Create persisted state object
      const persistedState: PersistedState = {
        recurringMessages: recurringMessagesData,
        userStates: userStatesData,
      };

      // Save to database
      await db
        .insert(telegramBotState)
        .values({
          id: "main",
          stateType: "core",
          data: persistedState as any,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: telegramBotState.id,
          set: {
            data: persistedState as any,
            updatedAt: new Date(),
          },
        });

      logger.info("Bot state saved to database");
    } catch (error) {
      logger.error("Failed to save bot state to database", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Export singleton instance
export const stateManager = new BotStateManager();
