import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/db.ts',
    './src/schema/arcana.ts',
    './src/schema/builder.ts',
    './src/schema/personaMemories.ts',
  ],
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
