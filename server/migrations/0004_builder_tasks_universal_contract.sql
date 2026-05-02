ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS intent_kind varchar(40) NOT NULL DEFAULT 'code_change';

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS requested_output_kind varchar(40) NOT NULL DEFAULT 'code_artifact';

ALTER TABLE builder_tasks
ADD COLUMN IF NOT EXISTS requested_output_format varchar(20) NOT NULL DEFAULT 'code';
