-- Arcana Studio - Phase 1 Migration

CREATE TABLE IF NOT EXISTS persona_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  subtitle VARCHAR(200),
  archetype VARCHAR(50) DEFAULT 'custom',
  description TEXT,
  icon VARCHAR(20) DEFAULT '✦',
  color VARCHAR(7) DEFAULT '#888888',
  tier VARCHAR(20) NOT NULL DEFAULT 'user_created',
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  character_tuning JSONB NOT NULL DEFAULT '{"intensity":50,"empathy":50,"confrontation":50}',
  tone_mode JSONB NOT NULL DEFAULT '{"mode":"serioes","slider":50}',
  quirks JSONB NOT NULL DEFAULT '[]',
  voice_config JSONB NOT NULL DEFAULT '{"voiceName":"Algieba","accent":"off","accentIntensity":50,"speakingTempo":50,"pauseDramaturgy":50,"emotionalIntensity":50}',
  maya_special TEXT,
  credit_config JSONB NOT NULL DEFAULT '{"creationCost":50,"textCostPerMessage":2,"audioCostPerMessage":4}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  moderation_score INTEGER,
  moderation_flags JSONB DEFAULT '[]',
  preset_id VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_persona_def_created_by
  ON persona_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_persona_def_tier
  ON persona_definitions(tier);
CREATE INDEX IF NOT EXISTS idx_persona_def_status
  ON persona_definitions(status);

CREATE TABLE IF NOT EXISTS persona_voice_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  persona_id VARCHAR(50) NOT NULL,
  voice_name VARCHAR(50),
  accent VARCHAR(30),
  accent_intensity INTEGER DEFAULT 50,
  speaking_tempo INTEGER,
  pause_dramaturgy INTEGER,
  emotional_intensity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, persona_id)
);

CREATE TABLE IF NOT EXISTS persona_presets (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_character JSONB NOT NULL,
  default_tone JSONB NOT NULL,
  default_quirks JSONB NOT NULL DEFAULT '[]',
  default_voice JSONB NOT NULL,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO persona_presets (
  id,
  name,
  description,
  default_character,
  default_tone,
  default_quirks,
  default_voice,
  category
) VALUES (
  'historisch',
  'Historische Persoenlichkeit',
  'Fuer historische Figuren die aus ihrer Zeit heraus sprechen',
  '{"intensity":70,"empathy":40,"confrontation":60}',
  '{"mode":"serioes","slider":30}',
  '[]',
  '{"voiceName":"Enceladus","accent":"off","accentIntensity":50,"speakingTempo":50,"pauseDramaturgy":60,"emotionalIntensity":50}',
  'Geschichte'
) ON CONFLICT (id) DO NOTHING;