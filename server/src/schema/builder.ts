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
