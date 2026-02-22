CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS persona_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  persona_id varchar NOT NULL,
  category varchar NOT NULL,
  memory_text text NOT NULL,
  importance int NOT NULL CHECK (importance >= 1 AND importance <= 3),
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT persona_memories_memory_text_len CHECK (char_length(memory_text) <= 200)
);

CREATE INDEX IF NOT EXISTS persona_memories_user_persona_idx ON persona_memories (user_id, persona_id);
CREATE INDEX IF NOT EXISTS persona_memories_user_persona_cat_idx ON persona_memories (user_id, persona_id, category);
CREATE INDEX IF NOT EXISTS persona_memories_user_persona_importance_idx ON persona_memories (user_id, persona_id, importance DESC);
