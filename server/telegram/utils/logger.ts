export function log(message: string): void {
  console.log(`\n🤖 [Telegram Bot] ${new Date().toLocaleTimeString()} - ${message}\n`);
}
