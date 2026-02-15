import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database operations');
  }

  const sql = neon(databaseUrl);
  dbInstance = drizzle(sql);
  return dbInstance;
}

// Profiles table with JSONB for profile data
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileJson: text('profile_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types for database operations
export interface ProfileRecord {
  id: string;
  profileJson: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewProfile = Omit<ProfileRecord, 'id' | 'createdAt' | 'updatedAt'>;
