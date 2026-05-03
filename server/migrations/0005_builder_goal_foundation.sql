ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES builder_tasks(id);

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS goal_kind varchar(30) NOT NULL DEFAULT 'task';

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS success_conditions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS revision_log jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS budget_iterations integer NOT NULL DEFAULT 1;

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS budget_used integer NOT NULL DEFAULT 0;
