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

CREATE TABLE IF NOT EXISTS voice_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  speaker_id VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  embedding FLOAT8[],
  session_count INTEGER DEFAULT 1,
  gdpr_consent BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP WITH TIME ZONE,
  is_owner BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, speaker_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_user
  ON voice_profiles(user_id);

CREATE TABLE IF NOT EXISTS session_memories (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  persona_id VARCHAR(50),
  session_date DATE DEFAULT CURRENT_DATE,
  topic_tags TEXT[],
  emotion_tone VARCHAR(50),
  key_insight TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_memories_user
  ON session_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_session_memories_date
  ON session_memories(user_id, session_date DESC);
