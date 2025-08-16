import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './services/identity/src/db/schema/index.ts',
  out: './services/identity/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
