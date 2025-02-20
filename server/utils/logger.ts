export function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${message}`, error);
}

export function logAction(message: string, info?: any): void {
  console.log(`[ACTION] ${message}`, info);
}
