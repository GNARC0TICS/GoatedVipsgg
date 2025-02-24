import { botResponses, botInteractions } from '../../db/schema/telegram';
import { db } from '@db';
import { eq, like, desc } from 'drizzle-orm';

interface ProcessedMessage {
  originalText: string;
  normalizedText: string;
  tokens: string[];
  context?: Record<string, any>;
}

export class BotNLPService {
  // Simple text normalization
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  // Basic tokenization
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(Boolean);
  }

  // Calculate similarity between two texts (using simple word overlap for now)
  private calculateSimilarity(text1: string[], text2: string[]): number {
    const set1 = new Set(text1);
    const set2 = new Set(text2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  // Process incoming message
  public processMessage(text: string): ProcessedMessage {
    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenize(normalizedText);
    
    return {
      originalText: text,
      normalizedText,
      tokens,
    };
  }

  // Find best matching response
  public async findBestResponse(message: ProcessedMessage): Promise<{
    responseText: string;
    responseId: number;
    similarity: number;
  } | null> {
    const patterns = await db.select()
      .from(botResponses)
      .where(eq(botResponses.isActive, true))
      .orderBy(desc(botResponses.useCount))
      .execute();

    let bestMatch = {
      responseText: '',
      responseId: 0,
      similarity: 0
    };

    for (const pattern of patterns) {
      const patternTokens = this.tokenize(this.normalizeText(pattern.pattern));
      const similarity = this.calculateSimilarity(message.tokens, patternTokens);

      if (similarity > bestMatch.similarity && similarity > 0.3) { // Minimum threshold
        bestMatch = {
          responseText: pattern.response,
          responseId: pattern.id,
          similarity
        };
      }
    }

    return bestMatch.similarity > 0 ? bestMatch : null;
  }

  // Record an interaction
  public async recordInteraction(
    messageText: string,
    responseId: number,
    telegramUserId: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    await db.insert(botInteractions).values({
      messageText,
      responseId,
      telegramUserId,
      context
    }).execute();

    // Update use count
    await db.update(botResponses)
      .set({ useCount: sql`${botResponses.useCount} + 1` })
      .where(eq(botResponses.id, responseId))
      .execute();
  }

  // Add new response pattern (admin only)
  public async addResponse(
    pattern: string,
    response: string,
    createdBy: string,
    context?: string
  ): Promise<void> {
    await db.insert(botResponses).values({
      pattern,
      response,
      createdBy,
      context
    }).execute();
  }

  // Record feedback about response helpfulness
  public async recordFeedback(
    interactionId: number,
    wasHelpful: boolean
  ): Promise<void> {
    await db.update(botInteractions)
      .set({ wasHelpful })
      .where(eq(botInteractions.id, interactionId))
      .execute();
  }
}

// Export singleton instance
export const nlpService = new BotNLPService();
