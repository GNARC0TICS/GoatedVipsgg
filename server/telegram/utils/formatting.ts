/**
 * Utility functions for formatting numbers and creating progress bars
 */

/**
 * Format a number with proper decimal places and commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Create a text-based progress bar
 * @param current Current value
 * @param target Target value
 * @param length Length of the progress bar
 * @returns Progress bar string
 */
export function createProgressBar(current: number, target: number, length: number = 10): string {
  const progress = Math.min(Math.max(current / target, 0), 1);
  const filled = Math.round(progress * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
