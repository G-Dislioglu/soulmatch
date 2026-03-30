import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type {
  ArchetypeKey,
  CharacterTuning,
  PersonaCreditConfig,
  PersonaStatus,
  PersonaTier,
  SignatureQuirk,
  ToneMode,
  VoiceConfig,
} from '../shared/types/persona.js';

export const personaDefinitions = pgTable('persona_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  subtitle: varchar('subtitle', { length: 200 }),
  archetype: varchar('archetype', { length: 50 }).$type<ArchetypeKey>().notNull().default('custom'),
  description: text('description'),
  icon: varchar('icon', { length: 20 }).notNull().default('✦'),
  color: varchar('color', { length: 7 }).notNull().default('#888888'),
  tier: varchar('tier', { length: 20 }).$type<PersonaTier>().notNull().default('user_created'),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  characterTuning: jsonb('character_tuning').$type<CharacterTuning>().notNull().default({
    intensity: 50,
    empathy: 50,
    confrontation: 50,
  }),
  toneMode: jsonb('tone_mode').$type<ToneMode>().notNull().default({
    mode: 'serioes',
    slider: 50,
  }),
  quirks: jsonb('quirks').$type<SignatureQuirk[]>().notNull().default([]),
  voiceConfig: jsonb('voice_config').$type<VoiceConfig>().notNull().default({
    voiceName: 'Algieba',
    accent: 'off',
    accentIntensity: 50,
    speakingTempo: 50,
    pauseDramaturgy: 50,
    emotionalIntensity: 50,
  }),
  mayaSpecial: text('maya_special'),
  creditConfig: jsonb('credit_config').$type<PersonaCreditConfig>().notNull().default({
    creationCost: 50,
    textCostPerMessage: 2,
    audioCostPerMessage: 4,
  }),
  status: varchar('status', { length: 20 }).$type<PersonaStatus>().notNull().default('draft'),
  moderationScore: integer('moderation_score'),
  moderationFlags: jsonb('moderation_flags').$type<string[]>().default([]),
  presetId: varchar('preset_id', { length: 50 }),
});

export const personaVoiceOverrides = pgTable('persona_voice_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 100 }).notNull(),
  personaId: varchar('persona_id', { length: 50 }).notNull(),
  voiceName: varchar('voice_name', { length: 50 }),
  accent: varchar('accent', { length: 30 }),
  accentIntensity: integer('accent_intensity').default(50),
  speakingTempo: integer('speaking_tempo'),
  pauseDramaturgy: integer('pause_dramaturgy'),
  emotionalIntensity: integer('emotional_intensity'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const personaPresets = pgTable('persona_presets', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  defaultCharacter: jsonb('default_character').notNull(),
  defaultTone: jsonb('default_tone').notNull(),
  defaultQuirks: jsonb('default_quirks').notNull().default([]),
  defaultVoice: jsonb('default_voice').notNull(),
  category: varchar('category', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});