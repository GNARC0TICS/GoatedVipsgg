declare module '@db' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  import * as schema from './schema';
  
  export const db: PostgresJsDatabase<typeof schema>;
  export * from './schema';
  export * from './schema/telegram';
  export default db;
}

declare module '@db/schema' {
  export * from './schema';
}
