
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './migrations',
  driver: 'postgresql',
  dialect: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
