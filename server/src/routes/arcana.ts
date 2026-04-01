import { randomUUID } from 'crypto';
import { and, asc, eq, ne } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db.js';
import { devLogger } from '../devLogger.js';
import { generateTTS } from '../lib/ttsService.js';
import {
  ACCENT_CATALOG,
  CREDIT_TIERS,
  SYSTEM_PERSONA_VOICES,
  VOICE_CATALOG,
} from '../lib/voiceCatalog.js';
import { buildTtsPrompt } from '../lib/voicePromptBuilder.js';
import { personaDefinitions, personaPresets } from '../schema/arcana.js';
import type {
  AccentKey,
  ArchetypeKey,
  CharacterTuning,
  PersonaCreditConfig,
  PersonaDefinition,
  PersonaStatus,
  SignatureQuirk,
  ToneMode,
  VoiceConfig,
} from '../shared/types/persona.js';

const DEFAULT_CHARACTER: CharacterTuning = {
  intensity: 50,
  empathy: 50,
  confrontation: 50,
};

const DEFAULT_TONE: ToneMode = {
  mode: 'serioes',
  slider: 50,
};

const DEFAULT_VOICE: VoiceConfig = {
  voiceName: 'Algieba',
  accent: 'off',
  accentIntensity: 50,
  speakingTempo: 50,
  pauseDramaturgy: 50,
  emotionalIntensity: 50,
};

const DEFAULT_CREDITS: PersonaCreditConfig = {
  creationCost: CREDIT_TIERS.user_basic.creationCost,
  textCostPerMessage: CREDIT_TIERS.user_basic.textCostPerMessage,
  audioCostPerMessage: CREDIT_TIERS.user_basic.audioCostPerMessage,
};

const SYSTEM_CREATED_AT = new Date(0).toISOString();

interface PersonaMutationBody {
  userId?: string;
  name?: string;
  subtitle?: string;
  archetype?: ArchetypeKey;
  description?: string;
  icon?: string;
  color?: string;
  tier?: string;
  characterTuning?: CharacterTuning;
  toneMode?: ToneMode;
  quirks?: SignatureQuirk[];
  voiceConfig?: VoiceConfig;
  mayaSpecial?: string;
  creditConfig?: PersonaCreditConfig;
  presetId?: string;
  status?: string;
}

interface TtsPreviewBody {
  text?: string;
  voiceName?: string;
  accent?: string;
  accentIntensity?: number;
}

export const arcanaRouter = Router();

function normalizeUserId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isValidVoiceName(value: unknown): value is VoiceConfig['voiceName'] {
  return typeof value === 'string' && VOICE_CATALOG.some((entry) => entry.name === value);
}

function isValidAccent(value: unknown): value is AccentKey {
  return typeof value === 'string' && ACCENT_CATALOG.some((entry) => entry.key === value);
}

function clampSlider(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function titleFromPersonaId(personaId: string): string {
  return personaId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildSystemPersona(personaId: string): PersonaDefinition {
  const systemVoice = SYSTEM_PERSONA_VOICES[personaId]!;

  return {
    id: personaId,
    name: titleFromPersonaId(personaId),
    subtitle: 'System-Persona',
    archetype: 'custom',
    description: `System-Persona ${titleFromPersonaId(personaId)} mit festem Arcana-Voice-Profil.`,
    icon: '✦',
    color: '#888888',
    tier: 'system',
    createdBy: 'system',
    createdAt: SYSTEM_CREATED_AT,
    updatedAt: SYSTEM_CREATED_AT,
    character: { ...DEFAULT_CHARACTER },
    toneMode: { ...DEFAULT_TONE },
    quirks: [],
    voice: {
      voiceName: systemVoice.voiceName,
      accent: systemVoice.accent,
      accentIntensity: 50,
      speakingTempo: 50,
      pauseDramaturgy: 50,
      emotionalIntensity: 50,
    },
    credits: {
      creationCost: CREDIT_TIERS.system.creationCost,
      textCostPerMessage: CREDIT_TIERS.system.textCostPerMessage,
      audioCostPerMessage: CREDIT_TIERS.system.audioCostPerMessage,
    },
    status: 'active',
  };
}

function mapPersonaRow(row: typeof personaDefinitions.$inferSelect): PersonaDefinition {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle ?? '',
    archetype: row.archetype,
    description: row.description ?? '',
    icon: row.icon,
    color: row.color,
    tier: row.tier,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    character: row.characterTuning,
    toneMode: row.toneMode,
    quirks: row.quirks,
    voice: row.voiceConfig,
    mayaSpecial: row.mayaSpecial ?? undefined,
    credits: row.creditConfig,
    presetId: row.presetId ?? undefined,
    status: row.status,
    moderationScore: row.moderationScore ?? undefined,
    moderationFlags: row.moderationFlags ?? undefined,
  };
}

function buildVoiceConfigFromPreview(body: TtsPreviewBody): VoiceConfig {
  return {
    voiceName: isValidVoiceName(body.voiceName) ? body.voiceName : DEFAULT_VOICE.voiceName,
    accent: isValidAccent(body.accent) ? body.accent : DEFAULT_VOICE.accent,
    accentIntensity: clampSlider(body.accentIntensity),
    speakingTempo: 50,
    pauseDramaturgy: 50,
    emotionalIntensity: 50,
  };
}

function buildPersonaInsert(body: PersonaMutationBody, userId: string) {
  const now = new Date();

  return {
    id: randomUUID(),
    name: body.name!.trim(),
    subtitle: normalizeText(body.subtitle) ?? '',
    archetype: body.archetype ?? 'custom',
    description: normalizeText(body.description) ?? '',
    icon: normalizeText(body.icon) ?? '✦',
    color: normalizeText(body.color) ?? '#888888',
    tier: 'user_created' as const,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    characterTuning: body.characterTuning ?? DEFAULT_CHARACTER,
    toneMode: body.toneMode ?? DEFAULT_TONE,
    quirks: body.quirks ?? [],
    voiceConfig: body.voiceConfig ?? DEFAULT_VOICE,
    mayaSpecial: normalizeText(body.mayaSpecial) ?? null,
    creditConfig: body.creditConfig ?? DEFAULT_CREDITS,
    status: 'draft' as PersonaStatus,
    moderationScore: null,
    moderationFlags: [],
    presetId: normalizeText(body.presetId) ?? null,
  };
}

function buildPersonaUpdate(body: PersonaMutationBody) {
  return {
    ...(body.name ? { name: body.name.trim() } : {}),
    ...(body.subtitle !== undefined ? { subtitle: normalizeText(body.subtitle) ?? '' } : {}),
    ...(body.archetype ? { archetype: body.archetype } : {}),
    ...(body.description !== undefined ? { description: normalizeText(body.description) ?? '' } : {}),
    ...(body.icon !== undefined ? { icon: normalizeText(body.icon) ?? '✦' } : {}),
    ...(body.color !== undefined ? { color: normalizeText(body.color) ?? '#888888' } : {}),
    ...(body.characterTuning ? { characterTuning: body.characterTuning } : {}),
    ...(body.toneMode ? { toneMode: body.toneMode } : {}),
    ...(body.quirks ? { quirks: body.quirks } : {}),
    ...(body.voiceConfig ? { voiceConfig: body.voiceConfig } : {}),
    ...(body.mayaSpecial !== undefined ? { mayaSpecial: normalizeText(body.mayaSpecial) ?? null } : {}),
    ...(body.creditConfig ? { creditConfig: body.creditConfig } : {}),
    ...(body.presetId !== undefined ? { presetId: normalizeText(body.presetId) ?? null } : {}),
    updatedAt: new Date(),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

arcanaRouter.get('/arcana/personas', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = normalizeUserId(
      (req.query as { userId?: string } | undefined)?.userId
      ?? (req.body as { userId?: string } | undefined)?.userId,
    );
    const systemPersonas = Object.keys(SYSTEM_PERSONA_VOICES).map(buildSystemPersona);

    if (!userId) {
      return res.json(systemPersonas);
    }

    const userPersonas = await db
      .select()
      .from(personaDefinitions)
      .where(and(eq(personaDefinitions.createdBy, userId), ne(personaDefinitions.status, 'archived')))
      .orderBy(asc(personaDefinitions.createdAt));

    res.json([...systemPersonas, ...userPersonas.map(mapPersonaRow)]);
  } catch (error) {
    devLogger.error('api', 'Failed to list Arcana personas', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

arcanaRouter.post('/arcana/personas', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body = req.body as PersonaMutationBody;
    const userId = normalizeUserId(body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!body.name || body.name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (body.name.trim().length > 100) {
      return res.status(400).json({ error: 'name must be at most 100 characters' });
    }

    if (body.tier && body.tier !== 'user_created') {
      return res.status(400).json({ error: 'tier must be user_created' });
    }

    const personaToInsert = buildPersonaInsert(body, userId);
    await db.insert(personaDefinitions).values(personaToInsert);

    devLogger.info('api', 'Arcana persona created', { personaId: personaToInsert.id, userId });
    res.status(201).json(mapPersonaRow(personaToInsert));
  } catch (error) {
    devLogger.error('api', 'Failed to create Arcana persona', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

arcanaRouter.get('/arcana/personas/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (SYSTEM_PERSONA_VOICES[id]) {
      return res.json(buildSystemPersona(id));
    }

    const userId = normalizeUserId((req.body as { userId?: string } | undefined)?.userId);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await db
      .select()
      .from(personaDefinitions)
      .where(
        and(
          eq(personaDefinitions.id, id),
          eq(personaDefinitions.createdBy, userId),
          ne(personaDefinitions.status, 'archived'),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json(mapPersonaRow(result[0]!));
  } catch (error) {
    devLogger.error('api', 'Failed to load Arcana persona', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

arcanaRouter.put('/arcana/personas/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const body = req.body as PersonaMutationBody;
    const userId = normalizeUserId(body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (body.status !== undefined) {
      return res.status(400).json({ error: 'status updates are not allowed in phase_4' });
    }

    if (body.tier !== undefined) {
      return res.status(400).json({ error: 'tier updates are not allowed' });
    }

    if (body.name !== undefined && body.name.trim().length === 0) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }

    if (body.name && body.name.trim().length > 100) {
      return res.status(400).json({ error: 'name must be at most 100 characters' });
    }

    const existing = await db
      .select()
      .from(personaDefinitions)
      .where(eq(personaDefinitions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    const persona = existing[0]!;
    if (persona.createdBy !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (persona.tier === 'system') {
      return res.status(400).json({ error: 'system personas are not editable' });
    }

    const updates = buildPersonaUpdate(body);
    await db.update(personaDefinitions).set(updates).where(eq(personaDefinitions.id, id));

    const updated = await db
      .select()
      .from(personaDefinitions)
      .where(eq(personaDefinitions.id, id))
      .limit(1);

    devLogger.info('api', 'Arcana persona updated', { personaId: id, userId });
    res.json(mapPersonaRow(updated[0]!));
  } catch (error) {
    devLogger.error('api', 'Failed to update Arcana persona', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

arcanaRouter.delete('/arcana/personas/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = normalizeUserId((req.body as { userId?: string } | undefined)?.userId);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const existing = await db
      .select()
      .from(personaDefinitions)
      .where(eq(personaDefinitions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    const persona = existing[0]!;
    if (persona.createdBy !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (persona.tier === 'system') {
      return res.status(400).json({ error: 'system personas are not editable' });
    }

    await db
      .update(personaDefinitions)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(personaDefinitions.id, id), eq(personaDefinitions.createdBy, userId)));

    devLogger.info('api', 'Arcana persona archived', { personaId: id, userId });
    res.json({ ok: true, status: 'archived' });
  } catch (error) {
    devLogger.error('api', 'Failed to archive Arcana persona', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

arcanaRouter.post('/arcana/tts-preview', async (req: Request, res: Response) => {
  try {
    const body = req.body as TtsPreviewBody;

    if (!isValidVoiceName(body.voiceName)) {
      return res.status(400).json({ error: 'voiceName is required and must be a known Gemini voice' });
    }

    const previewText = normalizeText(body.text) ?? 'Hallo, ich bin eine Soulmatch Persona.';
    const voiceConfig = buildVoiceConfigFromPreview(body);
    const promptText = buildTtsPrompt(previewText, voiceConfig);
    const result = await withTimeout(
      generateTTS(promptText, 'arcana_preview', process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY, {
        accentProfile: 'off',
        voice: voiceConfig.voiceName,
      }),
      10000,
    );

    res.json({
      audio: result.audioBuffer.toString('base64'),
      mimeType: result.mimeType,
      engine: result.engine,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'timeout') {
      return res.status(504).json({ error: 'tts_preview_timeout' });
    }

    devLogger.error('api', 'Arcana TTS preview failed', { error: message });
    res.status(500).json({ error: 'tts_preview_failed', detail: message });
  }
});

arcanaRouter.get('/arcana/voices', (_req: Request, res: Response) => {
  res.json(VOICE_CATALOG);
});

arcanaRouter.get('/arcana/accents', (_req: Request, res: Response) => {
  res.json(ACCENT_CATALOG);
});

arcanaRouter.get('/arcana/presets', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const presets = await db.select().from(personaPresets).orderBy(asc(personaPresets.name));
    res.json(presets);
  } catch (error) {
    devLogger.error('api', 'Failed to list Arcana presets', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// ─── Maya Creator Chat ────────────────────────────────────────────────────────

const MAYA_SYSTEM_PROMPT =
  'Du bist Maya, die kreative Direktorin des Arcana Studios in Soulmatch. Du hilfst dem Nutzer dabei, eine einzigartige KI-Persona zu erschaffen. Deine Aufgabe:\n' +
  '- Stelle gezielte Fragen zu Persönlichkeit, Stimme, Widersprüchen und besonderen Merkmalen der neuen Persona\n' +
  '- Sei warmherzig aber direkt, mit einem Gespür für interessante Charaktere\n' +
  '- Halte deine Antworten kurz (2-4 Sätze) und stelle immer eine Folgefrage\n' +
  '- Wenn der Nutzer einen Namen oder ein Merkmal nennt, bestätige begeistert und frage nach dem nächsten Aspekt\n' +
  '- Antworte IMMER auf Deutsch in grammatikalisch korrekten, vollständigen Sätzen\n' +
  '- Verwende einen lebendigen, enthusiastischen Ton';

interface ArcanaChatMessage {
  role: 'user' | 'maya';
  content: string;
}

interface ArcanaChatPersonaContext {
  name?: string;
  archetype?: string;
  quirks?: string[];
  skills?: string[];
  tone?: string;
}

interface ArcanaChatBody {
  messages?: ArcanaChatMessage[];
  personaContext?: ArcanaChatPersonaContext;
}

async function runExtractionCall(
  messages: ArcanaChatMessage[],
  geminiApiKey: string,
): Promise<Record<string, unknown>> {
  const extractionUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const extractionSystemPrompt =
    'Analysiere das folgende Gespräch zwischen einem Nutzer und Maya (Casting-Direktorin). ' +
    'Extrahiere alle Persona-Merkmale die im Gespräch erwähnt oder impliziert wurden. ' +
    'Antworte NUR mit einem JSON-Objekt, kein Markdown, keine Backticks. ' +
    'Felder: name (string|null), traits (string[]|null), tone (string|null), ' +
    'quirks (string[]|null), skills (string[]|null), ' +
    'contradictions (Array<{polA:string,polB:string}>|null). ' +
    'Setze Felder auf null wenn nicht erwähnt.';

  const chatHistory = messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => `${m.role === 'maya' ? 'Maya' : 'Nutzer'}: ${m.content}`)
    .join('\n');

  const resp = await fetch(extractionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: chatHistory }] }],
      systemInstruction: { parts: [{ text: extractionSystemPrompt }] },
      generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Extraction HTTP ${resp.status}`);
  }

  const data = await resp.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // Strip markdown code fences if present
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  rawText = rawText.replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  return JSON.parse(rawText) as Record<string, unknown>;
}

arcanaRouter.post('/arcana/chat', async (req: Request, res: Response) => {
  const body = req.body as ArcanaChatBody;
  const messages: ArcanaChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const geminiApiKey = process.env.GEMINI_API_KEY;

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  function sendEvent(type: string, data: Record<string, unknown>): void {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  }

  if (!geminiApiKey) {
    sendEvent('error', { message: 'Maya ist gerade nicht erreichbar. Versuche es nochmal.' });
    res.end();
    return;
  }

  try {
    // Build system prompt, optionally enriched with current persona context
    const ctx = body.personaContext;
    let systemPrompt = MAYA_SYSTEM_PROMPT;
    if (ctx) {
      const ctxParts: string[] = [];
      if (ctx.name) ctxParts.push(`Persona-Name bisher: ${ctx.name}`);
      if (ctx.archetype) ctxParts.push(`Archetyp: ${ctx.archetype}`);
      if (ctx.quirks && ctx.quirks.length > 0) ctxParts.push(`Quirks: ${ctx.quirks.join(', ')}`);
      if (ctx.tone) ctxParts.push(`Tonalität: ${ctx.tone}`);
      if (ctxParts.length > 0) {
        systemPrompt += `\n\nAktueller Persona-Kontext:\n${ctxParts.join('\n')}`;
      }
    }

    // Map maya messages to Gemini "model" role
    const contents = messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'maya' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Gemini streaming endpoint
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent` +
      `?key=${geminiApiKey}&alt=sse`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.8,
        },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      devLogger.error('api', 'Maya Gemini text stream error', { status: geminiResp.status, error: errText.slice(0, 300) });
      sendEvent('error', { message: 'Maya ist gerade nicht erreichbar. Versuche es nochmal.' });
      res.end();
      return;
    }

    const reader = geminiResp.body?.getReader();
    if (!reader) {
      sendEvent('error', { message: 'Maya ist gerade nicht erreichbar. Versuche es nochmal.' });
      res.end();
      return;
    }

    let fullText = '';
    let buffer = '';
    const decoder = new TextDecoder();

    // Read and forward streaming chunks
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      // Keep the last (potentially partial) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]' || jsonStr.length === 0) continue;

        try {
          const chunk = JSON.parse(jsonStr) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const chunkText =
            chunk.candidates?.[0]?.content?.parts
              ?.map((p) => p.text ?? '')
              .join('') ?? '';
          if (chunkText.length > 0) {
            fullText += chunkText;
            sendEvent('text_delta', { chunk: chunkText });
          }
        } catch {
          // silently skip malformed JSON chunks
        }
      }
    }

    // Signal text completion
    sendEvent('text_done', { full: fullText });

    // Run extraction and TTS in parallel — extraction event sent before audio
    if (fullText.trim().length > 0) {
      const [extractionOutcome, ttsOutcome] = await Promise.allSettled([
        withTimeout(runExtractionCall(messages, geminiApiKey), 10000),
        withTimeout(
          generateTTS(fullText, 'maya', geminiApiKey, process.env.OPENAI_API_KEY),
          12000,
        ),
      ]);

      // Extraction event — optional, must not block or crash
      if (extractionOutcome.status === 'fulfilled') {
        sendEvent('extraction', { fields: extractionOutcome.value });
      } else {
        devLogger.warn('api', 'Maya extraction failed', { error: String(extractionOutcome.reason) });
      }

      // Audio event
      if (ttsOutcome.status === 'fulfilled') {
        sendEvent('audio', {
          base64: ttsOutcome.value.audioBuffer.toString('base64'),
          mimeType: ttsOutcome.value.mimeType,
        });
      } else {
        devLogger.warn('api', 'Maya creator TTS failed', { error: String(ttsOutcome.reason) });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    devLogger.error('api', 'Maya creator chat failed', { error: message });
    sendEvent('error', { message: 'Maya ist gerade nicht erreichbar. Versuche es nochmal.' });
  } finally {
    res.end();
  }
});