export function log(message: string): void {
  console.log(`[Telegram Bot] ${new Date().toLocaleTimeString()} - ${message}`);
}
