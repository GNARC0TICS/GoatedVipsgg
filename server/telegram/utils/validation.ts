/**
 * Input validation utilities for the Telegram bot
 * Implements robust sanitization and validation for user inputs
 */

import { z } from "zod";

/**
 * Sanitize a text input by trimming whitespace and removing control characters
 * @param text Text to sanitize
 * @returns Sanitized text or empty string if input is null/undefined
 */
export function sanitizeText(text: string | undefined | null): string {
  if (!text) return "";

  // Trim whitespace and replace control characters
  return text
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .replace(/\u200B-\u200D\uFEFF/g, ""); // Remove zero-width spaces
}

/**
 * Validate text input against basic requirements
 * @param text Text to validate
 * @param error Custom error message
 * @returns Validated text
 * @throws Error if validation fails
 */
export function validateText(
  text: string | undefined | null,
  error = "Text is required",
): string {
  const sanitized = sanitizeText(text);
  if (!sanitized) throw new Error(error);
  return sanitized;
}

/**
 * Validate a username with additional checks
 * @param username Username to validate
 * @param error Custom error message
 * @returns Validated username
 * @throws Error if validation fails
 */
export function validateUsername(username?: string | null): string {
  // Validate and sanitize
  const sanitized = validateText(username, "Username is required");

  // Additional username validations
  if (sanitized.length < 3) {
    throw new Error("Username is too short (minimum 3 characters)");
  }

  if (sanitized.length > 64) {
    throw new Error("Username is too long (maximum 64 characters)");
  }

  // Remove @ prefix if present
  return sanitized.startsWith("@") ? sanitized.substring(1) : sanitized;
}

/**
 * Create a validatable parameter from command match
 * @param match RegExpExecArray from command match
 * @param index Index of the parameter in the match array
 * @returns Sanitized parameter or undefined if not found
 */
export function getCommandParameter(
  match: RegExpExecArray | null,
  index = 1,
): string | undefined {
  return match && match[index] ? sanitizeText(match[index]) : undefined;
}

/**
 * Zod schema for a username parameter
 */
export const UsernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters" })
  .max(64, { message: "Username cannot exceed 64 characters" })
  .transform((val) => (val.startsWith("@") ? val.substring(1) : val));

/**
 * Zod schema for a message parameter
 */
export const MessageSchema = z
  .string()
  .min(1, { message: "Message cannot be empty" })
  .max(4096, { message: "Message cannot exceed 4096 characters" });

/**
 * Zod schema for a numeric parameter
 */
export const NumberSchema = z.coerce
  .number()
  .int()
  .positive({ message: "Value must be a positive number" });

/**
 * Parse and validate a command parameter using a zod schema
 * @param match RegExpExecArray from command match
 * @param schema Zod schema to validate against
 * @param index Index of the parameter in the match array
 * @returns Parsed parameter or undefined if invalid
 */
export function parseCommandParameter<T>(
  match: RegExpExecArray | null,
  schema: z.ZodType<T>,
  index = 1,
): T | undefined {
  const param = getCommandParameter(match, index);
  if (!param) return undefined;

  try {
    return schema.parse(param);
  } catch (error) {
    // Validation failed
    return undefined;
  }
}

/**
 * Validate if a string could contain dangerous SQL/NoSQL injection attempts
 * @param input String to check
 * @returns True if the string might contain injection attempts
 */
export function containsPotentialInjection(input: string): boolean {
  // SQL injection patterns
  const sqlPatterns = [
    /'\s*OR\s*'1'\s*=\s*'1/i, // ' OR '1'='1
    /'\s*OR\s*1\s*=\s*1/i, // ' OR 1=1
    /'\s*;\s*DROP\s+TABLE/i, // '; DROP TABLE
    /'\s*;\s*DELETE\s+FROM/i, // '; DELETE FROM
    /'\s*UNION\s+SELECT/i, // UNION SELECT
    /'\s*EXEC\s+xp_cmdshell/i, // EXEC xp_cmdshell
    /'\s*INTO\s+OUTFILE/i, // INTO OUTFILE
  ];

  // NoSQL injection patterns
  const noSqlPatterns = [
    /\{\s*\$ne\s*:/i, // {$ne:
    /\{\s*\$gt\s*:/i, // {$gt:
    /\{\s*\$where\s*:/i, // {$where:
    /\{\s*\$exists\s*:/i, // {$exists:
  ];

  // Check all patterns
  return [...sqlPatterns, ...noSqlPatterns].some((pattern) =>
    pattern.test(input),
  );
}
