CREATE TABLE IF NOT EXISTS builder_assumptions (
  id text PRIMARY KEY,
  text text NOT NULL,
  hardening_status varchar(16) NOT NULL DEFAULT 'accepted',
  reuse_allowed boolean NOT NULL DEFAULT false,
  source_kind varchar(20) NOT NULL,
  creator varchar(80) NOT NULL DEFAULT 'unknown',
  title varchar(200) NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  truncation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS builder_assumptions_source_kind_idx
  ON builder_assumptions (source_kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS builder_assumptions_hardening_status_idx
  ON builder_assumptions (hardening_status, updated_at DESC);