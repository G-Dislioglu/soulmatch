export type PolicyProfileName =
  | 'api_sse_fix'
  | 'ui_layout'
  | 'form_flow'
  | 'arch_sensitive'
  | 'db_sensitive'
  | 'refactor_safe';

export type TaskType = 'A' | 'B' | 'C' | 'D' | 'P' | 'S';

export interface PolicyProfile {
  required_lanes: string[];
  optional_lanes: string[];
  allowed_tools: string[];
  forbidden_files: string[];
  auto_needs_human_review: boolean;
  max_rounds: number;
  counterexamples_required: boolean;
  reuse_check_required: boolean;
}

export const BUILDER_POLICY_PROFILES: Record<PolicyProfileName, PolicyProfile> = {
  api_sse_fix: {
    required_lanes: ['code', 'runtime', 'review'],
    optional_lanes: ['browser'],
    allowed_tools: ['READ', 'FIND_PATTERN', 'PATCH', 'CALL', 'EXPECT', 'DB_VERIFY'],
    forbidden_files: ['package.json', 'db.ts'],
    auto_needs_human_review: false,
    max_rounds: 4,
    counterexamples_required: false,
    reuse_check_required: true,
  },
  ui_layout: {
    required_lanes: ['code', 'prototype', 'browser', 'review'],
    optional_lanes: ['runtime'],
    allowed_tools: ['READ', 'READ_UI', 'FIND_PATTERN', 'PATCH', 'PROTOTYPE', 'UI_RUN'],
    forbidden_files: ['server/', 'db.ts'],
    auto_needs_human_review: false,
    max_rounds: 5,
    counterexamples_required: false,
    reuse_check_required: true,
  },
  form_flow: {
    required_lanes: ['code', 'prototype', 'runtime', 'browser', 'review'],
    optional_lanes: ['counterexample'],
    allowed_tools: ['*'],
    forbidden_files: ['db.ts', '.env'],
    auto_needs_human_review: false,
    max_rounds: 6,
    counterexamples_required: true,
    reuse_check_required: true,
  },
  arch_sensitive: {
    required_lanes: ['code', 'counterexample', 'runtime', 'review'],
    optional_lanes: ['browser'],
    allowed_tools: ['READ', 'TRACE_FLOW', 'FIND_PATTERN', 'PATCH', 'CALL', 'EXPECT'],
    forbidden_files: ['builder.ts', 'db.ts', '.env', 'package.json'],
    auto_needs_human_review: true,
    max_rounds: 8,
    counterexamples_required: true,
    reuse_check_required: true,
  },
  db_sensitive: {
    required_lanes: ['code', 'counterexample', 'runtime', 'review'],
    optional_lanes: [],
    allowed_tools: ['READ', 'FIND_PATTERN', 'PATCH', 'DB_READ', 'DB_VERIFY'],
    forbidden_files: ['.env', 'package.json'],
    auto_needs_human_review: true,
    max_rounds: 6,
    counterexamples_required: true,
    reuse_check_required: true,
  },
  refactor_safe: {
    required_lanes: ['code', 'review'],
    optional_lanes: ['runtime'],
    allowed_tools: ['READ', 'FIND_PATTERN', 'PATCH', 'CHECK'],
    forbidden_files: ['db.ts', '.env'],
    auto_needs_human_review: false,
    max_rounds: 3,
    counterexamples_required: false,
    reuse_check_required: false,
  },
};

export const TASK_TYPE_TO_PROFILE: Record<TaskType, PolicyProfileName> = {
  A: 'api_sse_fix',
  B: 'ui_layout',
  C: 'form_flow',
  D: 'refactor_safe',
  P: 'ui_layout',
  S: 'arch_sensitive',
};
