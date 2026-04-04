import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const personaMemories = pgTable(
  'persona_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 100 }).notNull(),
    personaId: varchar('persona_id').notNull(),
    category: varchar('category').notNull(),
    memoryText: text('memory_text').notNull(),
    importance: integer('importance').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userPersonaIdx: index('persona_memories_user_persona_idx').on(table.userId, table.personaId),
    userPersonaCatIdx: index('persona_memories_user_persona_cat_idx').on(
      table.userId,
      table.personaId,
      table.category,
    ),
    userPersonaImportanceIdx: index('persona_memories_user_persona_importance_idx').on(
      table.userId,
      table.personaId,
      sql`${table.importance} DESC`,
    ),
    memoryTextLenCheck: check(
      'persona_memories_memory_text_len',
      sql`char_length(${table.memoryText}) <= 200`,
    ),
    importanceRangeCheck: check(
      'persona_memories_importance_range',
      sql`${table.importance} >= 1 AND ${table.importance} <= 3`,
    ),
  }),
);