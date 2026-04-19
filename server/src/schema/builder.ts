import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const BUILDER_STATUS = [
  'queued',
  'classifying',
  'prototyping',
  'prototype_review',
  'planning',
  'counterexampling',
  'applying',
  'checking',
  'testing',
  'browser_testing',
  'reviewing',
  'push_candidate',
  'needs_human_review',
  'review_needed',
  'blocked',
  'done',
  'reverted',
  'discarded',
] as const;

export type BuilderStatus = (typeof BUILDER_STATUS)[number];

export const builderTasks = pgTable('builder_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  goal: text('goal').notNull(),
  risk: varchar('risk', { length: 10 }).notNull().default('low'),
  taskType: varchar('task_type', { length: 5 }).notNull().default('A'),
  policyProfile: varchar('policy_profile', { length: 30 }),
  scope: jsonb('scope').$type<string[]>().notNull().default([]),
  notScope: jsonb('not_scope').$type<string[]>().notNull().default([]),
  requiredLanes: jsonb('required_lanes')
    .$type<string[]>()
    .notNull()
    .default(['code', 'runtime', 'review']),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  commitHash: varchar('commit_hash', { length: 40 }),
  tokenCount: integer('token_count').default(0),
  tokenBudget: integer('token_budget').default(5000),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderActions = pgTable('builder_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => builderTasks.id)
    .notNull(),
  lane: varchar('lane', { length: 20 }).notNull(),
  kind: varchar('kind', { length: 30 }).notNull(),
  actor: varchar('actor', { length: 15 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  tokenCount: integer('token_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderReviews = pgTable('builder_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => builderTasks.id)
    .notNull(),
  reviewer: varchar('reviewer', { length: 20 }).notNull(),
  verdict: varchar('verdict', { length: 10 }).notNull(),
  scopeOk: varchar('scope_ok', { length: 5 }).default('true'),
  reuseCheck: jsonb('reuse_check').$type<Record<string, unknown>>(),
  evidenceRefs: jsonb('evidence_refs').$type<string[]>().default([]),
  dissentPoints: jsonb('dissent_points').$type<string[]>().default([]),
  notes: text('notes'),
  patches: text('patches'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderTestResults = pgTable('builder_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => builderTasks.id)
    .notNull(),
  testName: varchar('test_name', { length: 100 }).notNull(),
  passed: varchar('passed', { length: 5 }).notNull(),
  details: text('details'),
  duration: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderArtifacts = pgTable('builder_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => builderTasks.id)
    .notNull(),
  artifactType: varchar('artifact_type', { length: 30 }).notNull(),
  lane: varchar('lane', { length: 20 }).notNull(),
  path: text('path'),
  jsonPayload: jsonb('json_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderMemory = pgTable('builder_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  layer: varchar('layer', { length: 30 }).notNull(),
  key: varchar('key', { length: 120 }).notNull(),
  taskId: uuid('task_id').references(() => builderTasks.id),
  worker: varchar('worker', { length: 20 }),
  summary: text('summary').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

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

export const builderWorkerScores = pgTable('builder_worker_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => builderTasks.id).notNull(),
  worker: varchar('worker', { length: 30 }).notNull(),
  quality: integer('quality').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderAgentProfiles = pgTable('builder_agent_profiles', {
  agentId: varchar('agent_id', { length: 30 }).primaryKey(),
  role: varchar('role', { length: 20 }).notNull().default('worker'),
  strengths: jsonb('strengths').$type<string[]>().notNull().default([]),
  weaknesses: jsonb('weaknesses').$type<string[]>().notNull().default([]),
  failurePatterns: jsonb('failure_patterns').$type<string[]>().notNull().default([]),
  lastLearnings: jsonb('last_learnings').$type<string[]>().notNull().default([]),
  fileExperience: jsonb('file_experience').$type<Record<string, { success: number; fail: number; lastUsed: string }>>().notNull().default({}),
  taskCount: integer('task_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  avgQuality: integer('avg_quality').notNull().default(0),
  lastReflection: timestamp('last_reflection', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const poolState = pgTable('pool_state', {
  id: integer('id').primaryKey(),
  poolsJson: text('pools_json').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
