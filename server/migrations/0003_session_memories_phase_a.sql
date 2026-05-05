CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS session_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar(100) NOT NULL,
  persona_id varchar(50) NOT NULL,
  being_class varchar(20) NOT NULL DEFAULT 'system',
  app_origin varchar(50) NOT NULL DEFAULT 'soulmatch',
  status varchar(30) NOT NULL DEFAULT 'proposal_only',
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  topic_tags text[],
  emotion_tone varchar(50),
  key_insight text,
  message_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_memories_user
  ON session_memories (user_id);

CREATE INDEX IF NOT EXISTS idx_session_memories_date
  ON session_memories (user_id, session_date DESC);
