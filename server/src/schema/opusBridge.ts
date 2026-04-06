import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { builderTasks } from './builder';

export const builderChatpool = pgTable('builder_chatpool', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => builderTasks.id)
    .notNull(),
  round: integer('round').notNull(),
  phase: varchar('phase', { length: 20 }).notNull(),
  actor: varchar('actor', { length: 20 }).notNull(),
  model: varchar('model', { length: 50 }).notNull(),
  content: text('content').notNull(),
  commands: jsonb('commands').$type<unknown[]>().notNull().default([]),
  executionResults: jsonb('execution_results')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  durationMs: integer('duration_ms').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderOpusLog = pgTable('builder_opus_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: varchar('action', { length: 30 }).notNull(),
  taskId: uuid('task_id'),
  chainId: uuid('chain_id'),
  input: jsonb('input').$type<Record<string, unknown>>().notNull().default({}),
  output: jsonb('output').$type<Record<string, unknown>>().notNull().default({}),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  costUsd: text('cost_usd'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderChains = pgTable('builder_chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  totalTokens: integer('total_tokens').default(0).notNull(),
  totalCostUsd: text('total_cost_usd'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderErrorCards = pgTable('builder_error_cards', {
  id: varchar('id', { length: 30 }).primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  problem: text('problem').notNull(),
  rootCause: text('root_cause').notNull(),
  solution: text('solution').notNull(),
  prevention: text('prevention').notNull(),
  affectedFiles: jsonb('affected_files').$type<string[]>().notNull().default([]),
  affectedNodes: jsonb('affected_nodes').$type<string[]>().notNull().default([]),
  sourceTaskId: uuid('source_task_id').references(() => builderTasks.id),
  foundBy: varchar('found_by', { length: 20 }),
  severity: varchar('severity', { length: 10 }).notNull().default('medium'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});