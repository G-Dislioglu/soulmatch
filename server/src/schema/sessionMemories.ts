import { date, index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sessionMemories = pgTable(
  'session_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 100 }).notNull(),
    personaId: varchar('persona_id', { length: 50 }).notNull(),
    beingClass: varchar('being_class', { length: 20 }).notNull().default('system'),
    appOrigin: varchar('app_origin', { length: 50 }).notNull().default('soulmatch'),
    status: varchar('status', { length: 30 }).notNull().default('proposal_only'),
    sessionDate: date('session_date').notNull().default(sql`CURRENT_DATE`),
    topicTags: text('topic_tags').array(),
    emotionTone: varchar('emotion_tone', { length: 50 }),
    keyInsight: text('key_insight'),
    messageCount: integer('message_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_session_memories_user').on(table.userId),
    userDateIdx: index('idx_session_memories_date').on(table.userId, table.sessionDate),
  }),
);
