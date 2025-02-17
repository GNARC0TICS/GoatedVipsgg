export function log(level: string, message: string, meta?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(meta && { meta })
  };
  console.log(JSON.stringify(logEntry));
}