import { Router } from 'express';
import type { Request, Response } from 'express';
import { STUDIO_RESULT_SCHEMA } from '../studioSchema.js';
import { buildSystemPrompt, buildSoloSystemPrompt, buildUserPrompt, buildOraclePrompt, buildDiscussPrompt } from '../studioPrompt.js';
import type { LilithIntensity, OracleQuestionType } from '../studioPrompt.js';
import { devLogger } from '../devLogger.js';
import { applyNarrativeGate } from '../lib/studioQuality.js';
import { buildStudioAnchors, renderAnchorInstructionBlock } from '../lib/studioAnchors.js';
import { NARRATIVE_FAIL_FIXTURE, NARRATIVE_PASS_FIXTURE } from '../shared/narrative/examples.js';
import { getProviderForPersona, getPersonaDefinition } from '../lib/personaRouter.js';
import { callProvider } from '../lib/providers.js';
import { getDb, profiles } from '../db.js';
import { eq, sql } from 'drizzle-orm';

export const studioRouter = Router();

studioRouter.post('/narrative/probe', (req: Request, res: Response) => {
  const scenario = req.body?.scenario === 'fail' ? 'fail' : 'pass';
  const fixture = scenario === 'fail' ? NARRATIVE_FAIL_FIXTURE : NARRATIVE_PASS_FIXTURE;
  const gated = applyNarrativeGate(fixture, {
    mode: 'profile',
    seats: fixture.turns.map((t) => t.seat),
  });

  res.json({
    status: 'ok',
    scenario,
    qualityDebug: gated.qualityDebug,
    output: gated.output,
  });
});

type ProviderName = 'openai' | 'deepseek' | 'xai';

interface ProviderConfig {
  apiUrl: string;
  envKey: string;
  defaultModel: string;
  engineVersion: string;
  supportsStructuredOutputs: boolean;
}

const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/responses',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-5-nano',
    engineVersion: 'studio-1.0-openai',
    supportsStructuredOutputs: true,
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    engineVersion: 'studio-1.0-deepseek',
    supportsStructuredOutputs: false,
  },
  xai: {
    apiUrl: 'https://api.x.ai/v1/chat/completions',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-4-1-fast-non-reasoning',
    engineVersion: 'studio-1.0-xai',
    supportsStructuredOutputs: false,
  },
};

interface StudioRequestBody {
  studioRequest: {
    mode: 'profile' | 'match';
    profileId?: string;
    matchKey?: string;
    userMessage: string;
    seats: string[];
    maxTurns: number;
  };
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
  profileExcerpt?: string;
  matchExcerpt?: string;
  chatExcerpt?: string;
  userMemory?: string;
  lilithIntensity?: LilithIntensity;
  soloPersona?: string;
  freeMode?: boolean;
}

function resolveApiKey(provider: ProviderName, clientApiKey?: string): string | undefined {
  return process.env[PROVIDER_CONFIGS[provider].envKey] || clientApiKey || undefined;
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const resp = await fetch(PROVIDER_CONFIGS.openai.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'studio_result',
          schema: STUDIO_RESULT_SCHEMA.schema,
        },
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API ${resp.status}: ${errText}`);
  }

  const data = await resp.json() as {
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  };

  let resultText: string | undefined;
  if (data.output) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content) {
        for (const part of item.content) {
          if (part.type === 'output_text' && part.text) {
            resultText = part.text;
            break;
          }
        }
      }
      if (resultText) break;
    }
  }

  if (!resultText) throw new Error('No text content in OpenAI response');
  return JSON.parse(resultText);
}

async function callChatCompletions(
  config: ProviderConfig,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; extraUserInstruction?: string }
) {
  const resp = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(opts?.extraUserInstruction
          ? [{ role: 'user' as const, content: `${opts.extraUserInstruction}\n\n${userPrompt}` }]
          : [{ role: 'user' as const, content: userPrompt }]),
      ],
      response_format: { type: 'json_object' },
      temperature: opts?.temperature ?? 0.7,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${config.engineVersion} API ${resp.status}: ${errText}`);
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  let content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in chat completion response');

  // Strip markdown code fences if LLM wraps JSON in ```json ... ```
  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(content);
}

studioRouter.post('/studio', async (req: Request, res: Response) => {
  const body = req.body as StudioRequestBody;

  if (!body.studioRequest?.userMessage) {
    res.status(400).json({ error: 'Missing studioRequest.userMessage' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    res.status(400).json({ error: `Unknown provider: ${providerName}` });
    return;
  }

  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) {
    res.status(500).json({
      error: `No API key for ${providerName}. Set ${config.envKey} on server or provide key in Settings.`,
    });
    return;
  }

  const model = body.model || config.defaultModel;
  const { studioRequest, profileExcerpt, matchExcerpt, chatExcerpt, userMemory } = body;
  const anchors = buildStudioAnchors({
    profileExcerpt,
    matchExcerpt,
    userMessage: studioRequest.userMessage,
  });
  const anchorInstruction = renderAnchorInstructionBlock(anchors);

  const lilithIntensity: LilithIntensity = body.lilithIntensity ?? 'ehrlich';
  const systemPrompt = body.soloPersona
    ? buildSoloSystemPrompt(body.soloPersona, lilithIntensity, body.freeMode ?? false)
    : buildSystemPrompt(lilithIntensity);
  const userPrompt = buildUserPrompt({
    mode: studioRequest.mode,
    profileExcerpt,
    matchExcerpt,
    chatExcerpt,
    userMemory,
    anchorInstruction,
    userMessage: studioRequest.userMessage,
    seats: studioRequest.seats,
  });

  const startTime = Date.now();

  try {
    let parsed;

    devLogger.info('llm', `Calling ${providerName}/${model}`, {
      provider: providerName,
      model,
      messageLength: studioRequest.userMessage.length,
    });

    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, systemPrompt, userPrompt);
    } else {
      parsed = await callChatCompletions(config, apiKey, model, systemPrompt, userPrompt);
    }

    const durationMs = Date.now() - startTime;
    devLogger.info('llm', `${providerName}/${model} responded in ${durationMs}ms`, {
      provider: providerName,
      model,
      durationMs,
      rawKeys: Object.keys(parsed),
    });

    // Normalize: some LLMs wrap result in a top-level key
    if (!parsed.turns && parsed.result && typeof parsed.result === 'object') {
      parsed = parsed.result;
    }
    if (!parsed.turns && parsed.data && typeof parsed.data === 'object') {
      parsed = parsed.data;
    }

    // Normalize: nextSteps may come as next_steps
    if (!parsed.nextSteps && parsed.next_steps) {
      parsed.nextSteps = parsed.next_steps;
      delete parsed.next_steps;
    }

    // Normalize: watchOut may come as watch_out
    if (!parsed.watchOut && parsed.watch_out) {
      parsed.watchOut = parsed.watch_out;
      delete parsed.watch_out;
    }

    // Validate required fields
    const missing: string[] = [];
    if (!parsed.turns || !Array.isArray(parsed.turns)) missing.push('turns');
    if (!parsed.nextSteps || !Array.isArray(parsed.nextSteps)) missing.push('nextSteps');
    if (!parsed.watchOut || typeof parsed.watchOut !== 'string') missing.push('watchOut');

    if (missing.length > 0) {
      const errMsg = `Schema mismatch: missing ${missing.join(', ')}`;
      devLogger.error('llm', errMsg, {
        provider: providerName,
        model,
        durationMs: Date.now() - startTime,
        rawSnippet: JSON.stringify(parsed).slice(0, 300),
      });

      // === 1x Repair Retry (besonders wichtig für non-structured providers) ===
      try {
        devLogger.info('llm', `Attempting schema repair retry for ${providerName}/${model}`, {
          provider: providerName,
          model,
          missing,
        });

        const repairInstruction =
          `WICHTIG: Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, das EXAKT dieses Schema erfüllt:\n` +
          `- turns: Array von Objekten mit { seat: string, text: string }\n` +
          `- nextSteps: Array von Strings\n` +
          `- watchOut: String\n` +
          `Keine weiteren Keys. Kein Markdown. Keine Codefences.`;

        let repaired: Record<string, unknown>;

        if (providerName === 'openai') {
          repaired = await callOpenAI(apiKey, model, systemPrompt, `${repairInstruction}\n\n${userPrompt}`);
        } else {
          repaired = await callChatCompletions(
            config,
            apiKey,
            model,
            systemPrompt,
            userPrompt,
            { temperature: 0.0, extraUserInstruction: repairInstruction }
          );
        }

        // Normalize again
        if (!repaired.turns && repaired.result && typeof repaired.result === 'object') repaired = repaired.result as Record<string, unknown>;
        if (!repaired.turns && repaired.data && typeof repaired.data === 'object') repaired = repaired.data as Record<string, unknown>;
        if (!repaired.nextSteps && repaired.next_steps) { repaired.nextSteps = repaired.next_steps; delete repaired.next_steps; }
        if (!repaired.watchOut && repaired.watch_out) { repaired.watchOut = repaired.watch_out; delete repaired.watch_out; }

        const missing2: string[] = [];
        if (!repaired.turns || !Array.isArray(repaired.turns)) missing2.push('turns');
        if (!repaired.nextSteps || !Array.isArray(repaired.nextSteps)) missing2.push('nextSteps');
        if (!repaired.watchOut || typeof repaired.watchOut !== 'string') missing2.push('watchOut');

        if (missing2.length === 0) {
          parsed = repaired;
          devLogger.info('llm', `Schema repair retry succeeded for ${providerName}/${model}`, {
            provider: providerName,
            model,
            durationMs: Date.now() - startTime,
          });
        } else {
          const errMsg2 = `Schema repair failed: missing ${missing2.join(', ')}`;
          devLogger.error('llm', errMsg2, {
            provider: providerName,
            model,
            durationMs: Date.now() - startTime,
            rawSnippet: JSON.stringify(repaired).slice(0, 300),
          });
          devLogger.trackLLMCall(providerName, Date.now() - startTime, false, errMsg2);
          res.status(502).json({
            error: `LLM-Antwort fehlt: ${missing.join(', ')}. Bitte anderen Provider oder anderes Modell versuchen.`,
          });
          return;
        }
      } catch (repairErr) {
        const repairMsg = repairErr instanceof Error ? repairErr.message : String(repairErr);
        devLogger.error('llm', `Schema repair retry errored: ${repairMsg}`, {
          provider: providerName,
          model,
          durationMs: Date.now() - startTime,
        });
        devLogger.trackLLMCall(providerName, Date.now() - startTime, false, `Schema repair errored: ${repairMsg}`);
        res.status(502).json({
          error: `LLM-Antwort fehlt: ${missing.join(', ')}. Bitte anderen Provider oder anderes Modell versuchen.`,
        });
        return;
      }
    }

    // Ensure turns have valid seat/text
    parsed.turns = parsed.turns.map((t: Record<string, unknown>) => ({
      seat: String(t.seat ?? 'maya'),
      text: String(t.text ?? t.content ?? ''),
    }));

    // Ensure nextSteps is string array
    parsed.nextSteps = parsed.nextSteps.map((s: unknown) => String(s));

    const anchorsProvided = anchors.map((anchor) => anchor.id);
    const anchorsUsed = Array.isArray(parsed.anchorsUsed)
      ? parsed.anchorsUsed.map((id: unknown) => String(id).trim()).filter((id: string) => id.length > 0)
      : [];

    // Narrative quality gate: evaluate user-visible fields and apply fallback when needed.
    const gated = applyNarrativeGate(
      {
        turns: parsed.turns,
        nextSteps: parsed.nextSteps,
        watchOut: String(parsed.watchOut ?? ''),
      },
      {
        mode: studioRequest.mode,
        seats: studioRequest.seats,
        anchorsExpected: anchors.length > 0,
        providedAnchorIds: anchorsProvided,
        reportedAnchorIds: anchorsUsed,
      },
    );

    parsed.turns = gated.output.turns;
    parsed.nextSteps = gated.output.nextSteps;
    parsed.watchOut = gated.output.watchOut;
    parsed.qualityDebug = gated.qualityDebug;
    parsed.anchors = anchors;
    parsed.anchorsProvided = anchorsProvided;
    parsed.anchorsUsed = anchorsUsed;

    const warnings: string[] = [];
    if (gated.qualityDebug.fallbackUsed) {
      warnings.push('narrative_gate_fallback_applied');
    }

    parsed.meta = {
      engine: 'llm',
      engineVersion: config.engineVersion,
      computedAt: new Date().toISOString(),
      warnings,
    };

    devLogger.trackLLMCall(providerName, Date.now() - startTime, true);
    res.json(parsed);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : String(err);
    devLogger.error('llm', `${providerName} failed: ${errMsg}`, {
      provider: providerName,
      model,
      durationMs,
    });
    devLogger.trackLLMCall(providerName, durationMs, false, errMsg);
    res.status(500).json({
      error: `LLM-Aufruf an ${providerName} fehlgeschlagen: ${errMsg}`,
    });
  }
});

// POST /discuss — Multi-persona sequential discussion (1-3 personas, different providers)
interface DiscussRequestBody {
  personas: string[];
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userChart?: string;
  audioMode?: boolean;
  lilithIntensity?: LilithIntensity;
  clientApiKey?: string;
  userId?: string;
  end_session?: boolean;
  stream?: boolean;
}

type MemoryCategory = 'relationship' | 'career' | 'family' | 'personality' | 'general';

const DEEP_MEMORY_KEYWORDS = [
  'erinnerst',
  'damals',
  'früher',
  'letztes mal',
  'immer',
  'muster',
  'schon öfter',
  'weißt du noch',
];

function detectCategory(textRaw: string): MemoryCategory {
  const text = textRaw.toLowerCase();
  if (/(liebes|partner|partnerschaft|beziehung|freundin|freund|dating)/i.test(text)) return 'relationship';
  if (/(job|arbeit|karriere|chef|kollege|kündig|bewerb)/i.test(text)) return 'career';
  if (/(familie|mutter|vater|eltern|bruder|schwester|kind|tochter|sohn)/i.test(text)) return 'family';
  if (/(ich bin|charakter|persönlich|persönlichkeit|selbstbild|muster|trauma|angst)/i.test(text)) return 'personality';
  return 'general';
}

function wantsDeepMemory(textRaw: string): boolean {
  const text = textRaw.toLowerCase();
  return DEEP_MEMORY_KEYWORDS.some((k) => text.includes(k));
}

async function loadUserProfile(userId: string): Promise<undefined | { name?: string; birthDate?: string; birthTime?: string; birthPlace?: string; preferences?: string }> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (rows.length === 0) return undefined;
    const raw = rows[0]?.profileJson;
    if (!raw) return undefined;

    try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      return {
        name: typeof p.name === 'string' ? p.name : undefined,
        birthDate: typeof p.birthDate === 'string' ? p.birthDate : undefined,
        birthTime: typeof p.birthTime === 'string' ? p.birthTime : undefined,
        birthPlace: typeof p.birthPlace === 'string' ? p.birthPlace : undefined,
        preferences: typeof p.preferences === 'string' ? p.preferences : undefined,
      };
    } catch {
      return undefined;
    }
  } catch (e) {
    devLogger.error('system', 'loadUserProfile failed', { error: String(e), userId });
    return undefined;
  }
}

async function loadMemories(args: {
  userId: string;
  personaId: string;
  message: string;
}): Promise<{ mode: 'standard' | 'deep'; memories: Array<{ memory_text: string; category: string; importance: number; created_at: string | Date }> }> {
  const db = getDb();

  const deep = wantsDeepMemory(args.message);
  if (deep) {
    const rows = await db.execute(sql`
      SELECT memory_text, category, importance, created_at
      FROM persona_memories
      WHERE user_id = ${args.userId} AND persona_id = ${args.personaId}
      ORDER BY created_at ASC
    `);
    return {
      mode: 'deep',
      memories: (rows.rows as Array<{ memory_text: string; category: string; importance: number; created_at: string | Date }>) ?? [],
    };
  }

  const category = detectCategory(args.message);
  const rows = await db.execute(sql`
    SELECT memory_text, category, importance, created_at
    FROM persona_memories
    WHERE user_id = ${args.userId}
      AND persona_id = ${args.personaId}
      AND (category = ${category} OR category = 'general')
    ORDER BY importance DESC, created_at DESC
    LIMIT 3
  `);

  return {
    mode: 'standard',
    memories: (rows.rows as Array<{ memory_text: string; category: string; importance: number; created_at: string | Date }>) ?? [],
  };
}

function renderConversationForMemoryExtraction(messages: Array<{ role: string; content: string }>): string {
  return messages
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
    .join('\n');
}

async function extractNewMemories(args: {
  apiKey: string;
  conversationText: string;
}): Promise<Array<{ category: MemoryCategory; memory_text: string; importance: 1 | 2 | 3 }>> {
  const prompt = `Analysiere dieses Gespräch. Gib maximal 2 neue, wichtige Fakten über den User zurück, die für zukünftige Gespräche relevant sind. Nur wenn wirklich etwas Neues gelernt wurde, sonst leeres Array.

Format (JSON):
[
  {
    "category": "relationship"|"career"|"family"|"personality"|"general",
    "memory_text": "Max 200 Zeichen, als Fakt formuliert",
    "importance": 1|2|3
  }
]

Gespräch:
${args.conversationText}`;

  // Use the unified provider caller (OpenAI Responses API) for reliability.
  // Note: args.apiKey is passed as clientApiKey fallback; server env OPENAI_API_KEY still works.
  let content = await callProvider(
    'openai',
    'gpt-5-nano',
    {
      system: '',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 150,
    },
    args.apiKey,
  );
  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(content) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      category: (typeof item.category === 'string' ? item.category : 'general') as MemoryCategory,
      memory_text: typeof item.memory_text === 'string' ? item.memory_text : '',
      importance: (typeof item.importance === 'number' ? item.importance : 1) as 1 | 2 | 3,
    }))
    .filter((m) => ['relationship', 'career', 'family', 'personality', 'general'].includes(m.category))
    .map((m) => ({
      ...m,
      memory_text: m.memory_text.trim().slice(0, 200),
      importance: (m.importance === 3 || m.importance === 2 ? m.importance : 1) as 1 | 2 | 3,
    }))
    .filter((m) => m.memory_text.length > 0)
    .slice(0, 2);
}

async function saveMemories(args: {
  userId: string;
  personaId: string;
  memories: Array<{ category: MemoryCategory; memory_text: string; importance: 1 | 2 | 3 }>;
}): Promise<void> {
  if (args.memories.length === 0) return;
  const db = getDb();

  for (const m of args.memories) {
    const text = m.memory_text.trim().slice(0, 200);
    if (!text) continue;

    const snippet = text.slice(0, 24);
    const existing = await db.execute(sql`
      SELECT id
      FROM persona_memories
      WHERE user_id = ${args.userId}
        AND persona_id = ${args.personaId}
        AND memory_text ILIKE ${`%${snippet}%`}
      LIMIT 1
    `);

    if ((existing.rows?.length ?? 0) > 0) continue;

    await db.execute(sql`
      INSERT INTO persona_memories (user_id, persona_id, category, memory_text, importance)
      VALUES (${args.userId}, ${args.personaId}, ${m.category}, ${text}, ${m.importance})
    `);
  }
}

interface PersonaResponse {
  persona: string;
  text: string;
  color: string;
  provider: string;
  model: string;
  audio_url?: string;
}

interface DiscussResponse {
  responses: PersonaResponse[];
  creditsUsed: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectAddressedPersonaId(messageRaw: string): string | undefined {
  const message = messageRaw.toLowerCase();
  const personaIds = ['maya', 'stella', 'kael', 'luna', 'orion', 'lian', 'sibyl', 'amara', 'lilith'] as const;

  let best: { id: string; idx: number } | undefined;
  for (const id of personaIds) {
    const re = new RegExp(`(^|[^a-z0-9_])${id}([^a-z0-9_]|$)`, 'i');
    const m = re.exec(message);
    if (!m || typeof m.index !== 'number') continue;
    if (!best || m.index < best.idx) {
      best = { id, idx: m.index };
    }
  }

  return best?.id;
}

studioRouter.get('/openai-test', async (_req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'OPENAI_API_KEY not set' }); return; }
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Say: {"text":"ok"}' }],
        max_completion_tokens: 20,
        temperature: 0.5,
      }),
    });
    const body = await r.text();
    res.json({ status: r.status, body: JSON.parse(body) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

studioRouter.get('/discuss-diag', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    keys: {
      openai:   !!process.env.OPENAI_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      xai:      !!process.env.XAI_API_KEY,
    },
    models: {
      maya:       'gpt-5-nano (openai)',
      luna:       'deepseek-chat (deepseek)',
      orion:      'gpt-5-nano (openai)',
      lilith:     'grok-4-1-fast-non-reasoning (xai)',
      stella:     'gpt-5-mini (openai)',
      kael:       'grok-4-1-fast-non-reasoning (xai)',
      lian:       'deepseek-chat (deepseek)',
      sibyl:      'gpt-5-mini (openai)',
      amara:      'deepseek-chat (deepseek)',
      echo_prism: 'gpt-5 (openai)',
    },
    endpoint: 'POST /api/discuss',
  });
});

studioRouter.post('/discuss', async (req: Request, res: Response) => {
  const body = req.body as DiscussRequestBody;

  if (!body.personas || !Array.isArray(body.personas) || body.personas.length === 0) {
    res.status(400).json({ error: 'personas array required (1-3 items)' });
    return;
  }
  if (body.personas.length > 3) {
    res.status(400).json({ error: 'Maximal 3 Personas pro Diskussion' });
    return;
  }
  if (!body.message) {
    res.status(400).json({ error: 'message required' });
    return;
  }

  const responses: PersonaResponse[] = [];
  let accumulatedContext = '';
  const startTime = Date.now();

  const userId = typeof body.userId === 'string' && body.userId.trim().length > 0 ? body.userId.trim() : undefined;
  const userTurnCount = (body.conversationHistory ?? []).filter((m) => m.role === 'user').length + 1;
  const shouldLearn = !!userId && (body.end_session === true || (userTurnCount % 5 === 0));
  let userProfile: Awaited<ReturnType<typeof loadUserProfile>> = undefined;
  if (userId) {
    try {
      userProfile = await loadUserProfile(userId);
    } catch (e) {
      devLogger.error('system', 'Failed to load user profile for discuss', { error: String(e), userId });
      userProfile = undefined;
    }
  }

  // Avoid duplicating the current user message if the client already included it in conversationHistory.
  const convoForMemoryExtraction: Array<{ role: string; content: string }> = (() => {
    const history = body.conversationHistory ?? [];
    const last = history[history.length - 1];
    if (last && last.role === 'user' && last.content === body.message) return history;
    return [...history, { role: 'user', content: body.message }];
  })();

  const wantsStream = body.stream === true;
  if (wantsStream) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // nginx: disable buffering (best-effort)
    res.setHeader('X-Accel-Buffering', 'no');
  }

  function sendSseEvent(event: Record<string, unknown>): void {
    if (!wantsStream) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // This is the dynamic chat history used for persona calls.
  // It grows as each persona answers so later personas see earlier persona answers.
  const providerMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.conversationHistory ?? []).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ];

  const addressedPersonaId = detectAddressedPersonaId(body.message);
  const personasToCall = addressedPersonaId && body.personas.includes(addressedPersonaId)
    ? [addressedPersonaId]
    : body.personas;

  for (const personaId of personasToCall) {
    if (responses.length > 0) {
      await sleep(1500);
    }
    const providerConfig = getProviderForPersona(personaId);
    const personaDef = getPersonaDefinition(personaId);

    let memoryQuery: Awaited<ReturnType<typeof loadMemories>> | { mode: 'standard'; memories: Array<{ memory_text: string; category: string; importance: number; created_at: string | Date }> };
    if (userId) {
      try {
        memoryQuery = await loadMemories({ userId, personaId, message: body.message });
      } catch (e) {
        devLogger.error('system', 'Failed to load persona memories for discuss', { error: String(e), userId, personaId });
        memoryQuery = { mode: 'standard', memories: [] };
      }
    } else {
      memoryQuery = { mode: 'standard', memories: [] };
    }

    const systemPrompt = buildDiscussPrompt(personaId, {
      otherPersonas: personasToCall.filter((p) => p !== personaId),
      previousResponses: accumulatedContext,
      userChart: body.userChart ?? '',
      isFirstSpeaker: responses.length === 0,
      lilithIntensity: body.lilithIntensity ?? 'ehrlich',
      userProfile,
      memories: memoryQuery.memories,
      memoriesMode: memoryQuery.mode,
    });

    try {
      devLogger.info('llm', `Discuss: calling ${providerConfig.provider}/${providerConfig.model} for ${personaId}`, {
        provider: providerConfig.provider,
        model: providerConfig.model,
        persona: personaId,
      });

      const rawText = await callProvider(
        providerConfig.provider,
        providerConfig.model,
        { system: systemPrompt, messages: providerMessages, temperature: 0.85 },
        body.clientApiKey,
      );

      let text: string;
      try {
        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        text = typeof parsed.text === 'string'
          ? parsed.text
          : (typeof parsed.answer === 'string' ? parsed.answer : rawText);
      } catch {
        text = rawText;
      }

      const response: PersonaResponse = {
        persona: personaId,
        text,
        color: personaDef.color,
        provider: providerConfig.provider,
        model: providerConfig.model,
      };

      responses.push(response);
      accumulatedContext += `\n${personaDef.name}: ${text}`;

      // Make this answer available to later personas.
      providerMessages.push({ role: 'assistant', content: `${personaDef.name}: ${text}` });

      // Stream this persona response immediately to the client (if enabled).
      sendSseEvent({ type: 'persona', response });

      if (shouldLearn && userId) {
        try {
          const apiKey = process.env.OPENAI_API_KEY;
          if (apiKey) {
            const conversationText = renderConversationForMemoryExtraction(convoForMemoryExtraction);
            const extracted = await extractNewMemories({ apiKey, conversationText });
            await saveMemories({ userId, personaId, memories: extracted });
          }
        } catch (e) {
          devLogger.error('llm', 'Memory extraction failed', { error: String(e), personaId, userId });
        }
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      devLogger.error('llm', `Discuss: ${providerConfig.provider}/${providerConfig.model} failed for ${personaId}: ${errMsg}`, {
        persona: personaId,
        provider: providerConfig.provider,
        durationMs: Date.now() - startTime,
      });
      const response: PersonaResponse = {
        persona: personaId,
        text: `[${personaDef.name} Fehler: ${errMsg.slice(0, 200)}]`,
        color: personaDef.color,
        provider: providerConfig.provider,
        model: providerConfig.model,
      };
      responses.push(response);
      accumulatedContext += `\n${personaDef.name}: ${response.text}`;
      providerMessages.push({ role: 'assistant', content: `${personaDef.name}: ${response.text}` });
      sendSseEvent({ type: 'persona', response });
    }
  }

  const result: DiscussResponse = {
    responses,
    creditsUsed: personasToCall.length * (body.audioMode ? 10 : 1),
  };

  devLogger.info('llm', `Discuss: completed ${body.personas.length} personas in ${Date.now() - startTime}ms`);
  if (wantsStream) {
    sendSseEvent({ type: 'done', creditsUsed: result.creditsUsed });
    res.end();
    return;
  }

  res.json(result);
});

// POST /soul-portrait — Maya channels a poetic soul portrait from profile data
interface SoulPortraitRequestBody {
  name: string;
  birthDate: string;
  lifePath?: number;
  expression?: number;
  soulUrge?: number;
  sunSign?: string;
  moonSign?: string;
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
}

studioRouter.post('/soul-portrait', async (req: Request, res: Response) => {
  const body = req.body as SoulPortraitRequestBody;
  if (!body.name || !body.birthDate) {
    res.status(400).json({ error: 'name and birthDate required' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) {
    res.status(500).json({ error: `No API key for ${providerName}. Set ${config.envKey} or provide key in Settings.` });
    return;
  }

  const model = body.model || config.defaultModel;

  const system = `Du bist Maya, eine spirituelle Seelenführerin mit tiefer astrologischer und numerologischer Weisheit.
Du schreibst poetische, einfühlsame Seelenporträts – immer in der Du-Form, immer auf Deutsch.
Antworte NUR mit einem JSON-Objekt: { "portrait": "..." }
Das Portrait besteht aus genau 3 kurzen Absätzen (je 2-3 Sätze), durch \\n\\n getrennt.
Sei poetisch, tief und inspirierend – keine Klischees, keine Floskeln.`;

  const numeroParts: string[] = [];
  if (body.lifePath) numeroParts.push(`Lebenspfad ${body.lifePath}`);
  if (body.expression) numeroParts.push(`Ausdruckszahl ${body.expression}`);
  if (body.soulUrge) numeroParts.push(`Seelendrang ${body.soulUrge}`);
  const astroParts: string[] = [];
  if (body.sunSign) astroParts.push(`Sonne im ${body.sunSign}`);
  if (body.moonSign) astroParts.push(`Mond im ${body.moonSign}`);

  const user = `Channele ein Seelenporträt für ${body.name} (geboren ${body.birthDate}).
${numeroParts.length > 0 ? `Numerologie: ${numeroParts.join(', ')}.` : ''}
${astroParts.length > 0 ? `Astrologie: ${astroParts.join(', ')}.` : ''}
Schreibe ein tiefes, poetisches Porträt dieser Seele in 3 Absätzen.`;

  try {
    let parsed: Record<string, unknown>;
    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, system, user) as Record<string, unknown>;
    } else {
      parsed = await callChatCompletions(config, apiKey, model, system, user) as Record<string, unknown>;
    }
    const portrait = typeof parsed.portrait === 'string' ? parsed.portrait : JSON.stringify(parsed);
    res.json({ name: body.name, portrait });
  } catch (err) {
    res.status(500).json({ error: `Seelenporträt fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// POST /weekly-insight — Orion generates a weekly soul insight
interface WeeklyInsightRequestBody {
  name: string;
  lifePath: number;
  personalYear: number;
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
}

studioRouter.post('/weekly-insight', async (req: Request, res: Response) => {
  const body = req.body as WeeklyInsightRequestBody;
  if (!body.name || !body.lifePath) {
    res.status(400).json({ error: 'name and lifePath required' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) { res.status(500).json({ error: `No API key for ${providerName}.` }); return; }

  const now = new Date();
  const weekNum = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  const weekLabel = `KW ${weekNum}, ${now.getFullYear()}`;
  const model = body.model || config.defaultModel;

  const system = `Du bist Orion, der weise Seelenstratege und Navigator des inneren Kompasses.
Du gibst ${body.name} eine prägnante Wochenbotschaft.
Antworte NUR mit JSON: { "headline": "...", "insight": "...", "focus": "...", "shadow": "...", "affirmation": "..." }
- headline: 5-7 Worte als Wochentitel
- insight: 2-3 Sätze kosmischer Wochenausblick
- focus: 1 Satz — worauf ${body.name} diese Woche fokussieren soll
- shadow: 1 Satz — was zu beachten / zu transformieren ist
- affirmation: eine kraftvolle Wochenaffirmation (max 12 Worte)
Schreibe auf Deutsch, klar, weise, direkt. Keine leeren Phrasen.`;

  const user = `Wochenbotschaft für ${body.name} (LP ${body.lifePath}, Pers. Jahr ${body.personalYear}) für ${weekLabel}.`;

  try {
    let parsed: Record<string, unknown>;
    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, system, user) as Record<string, unknown>;
    } else {
      parsed = await callChatCompletions(config, apiKey, model, system, user) as Record<string, unknown>;
    }
    res.json({
      week: weekLabel,
      headline: typeof parsed.headline === 'string' ? parsed.headline : '',
      insight: typeof parsed.insight === 'string' ? parsed.insight : '',
      focus: typeof parsed.focus === 'string' ? parsed.focus : '',
      shadow: typeof parsed.shadow === 'string' ? parsed.shadow : '',
      affirmation: typeof parsed.affirmation === 'string' ? parsed.affirmation : '',
    });
  } catch (err) {
    res.status(500).json({ error: `Wochenbotschaft fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// POST /monthly-horoscope — Luna generates a monthly horoscope
interface MonthlyHoroRequestBody {
  sunSign: string;
  personalYear: number;
  name: string;
  month?: number;
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
}

studioRouter.post('/monthly-horoscope', async (req: Request, res: Response) => {
  const body = req.body as MonthlyHoroRequestBody;
  if (!body.sunSign || !body.name) {
    res.status(400).json({ error: 'sunSign and name required' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) { res.status(500).json({ error: `No API key for ${providerName}.` }); return; }

  const now = new Date();
  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const model = body.model || config.defaultModel;

  const system = `Du bist Luna, die romantische Traumführerin und Mondgöttin des Herzens.
Du gibst ein kurzes, poetisches Monatshoroskop für ${body.name}.
Antworte NUR mit JSON: { "opening": "...", "love": "...", "growth": "...", "mantra": "..." }
- opening: 1-2 Sätze kosmische Eröffnung für diesen Monat
- love: 1-2 Sätze Liebes/Beziehungsenergie
- growth: 1-2 Sätze persönliches Wachstum & Chance
- mantra: ein kurzes Monats-Mantra (max 10 Worte)
Schreibe auf Deutsch, poetisch, liebevoll. Keine Plattitüden.`;

  const lpInfo = body.personalYear ? ` Persönliches Jahr: ${body.personalYear}.` : '';
  const user = `Monatshoroskop für ${body.name} (${body.sunSign}) für ${monthName}.${lpInfo}`;

  try {
    let parsed: Record<string, unknown>;
    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, system, user) as Record<string, unknown>;
    } else {
      parsed = await callChatCompletions(config, apiKey, model, system, user) as Record<string, unknown>;
    }
    res.json({
      month: monthName,
      opening: typeof parsed.opening === 'string' ? parsed.opening : '',
      love: typeof parsed.love === 'string' ? parsed.love : '',
      growth: typeof parsed.growth === 'string' ? parsed.growth : '',
      mantra: typeof parsed.mantra === 'string' ? parsed.mantra : '',
    });
  } catch (err) {
    res.status(500).json({ error: `Horoskop fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// POST /compatibility-story — Luna + Orion co-narrate the soul connection
interface CompatStoryRequestBody {
  nameA: string;
  nameB: string;
  connectionType: string;
  score: number;
  lifepathA?: number;
  lifepathB?: number;
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
}

studioRouter.post('/compatibility-story', async (req: Request, res: Response) => {
  const body = req.body as CompatStoryRequestBody;
  if (!body.nameA || !body.nameB) {
    res.status(400).json({ error: 'nameA and nameB required' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) {
    res.status(500).json({ error: `No API key for ${providerName}.` });
    return;
  }

  const model = body.model || config.defaultModel;

  const system = `Du bist Luna, die romantische Traumführerin, und Orion, der Seelen-Abenteurer.
Ihr schreibt gemeinsam eine kurze poetische Geschichte über zwei Seelen.
Antworte NUR mit einem JSON-Objekt: { "story": "...", "luna": "...", "orion": "..." }
- "story": 2-3 Sätze poetische Prosa über die Verbindung dieser zwei Seelen (neutral, schön)
- "luna": Luna's romantische Perspektive auf diese Verbindung (1-2 Sätze)
- "orion": Orion's abenteuerliche Perspektive auf diese Verbindung (1-2 Sätze)
Schreibe auf Deutsch, poetisch, herzwarm. Keine Klischees.`;

  const lpInfo = body.lifepathA && body.lifepathB ? ` Lebenspfad ${body.nameA}: ${body.lifepathA}, ${body.nameB}: ${body.lifepathB}.` : '';
  const user = `Erzählt die Geschichte von ${body.nameA} und ${body.nameB} — ${body.connectionType}-Verbindung, Harmonie-Score ${body.score}%.${lpInfo}`;

  try {
    let parsed: Record<string, unknown>;
    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, system, user) as Record<string, unknown>;
    } else {
      parsed = await callChatCompletions(config, apiKey, model, system, user) as Record<string, unknown>;
    }
    res.json({
      story: typeof parsed.story === 'string' ? parsed.story : '',
      luna: typeof parsed.luna === 'string' ? parsed.luna : '',
      orion: typeof parsed.orion === 'string' ? parsed.orion : '',
    });
  } catch (err) {
    res.status(500).json({ error: `Geschichte fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// POST /oracle — Maya's 3 sacred questions
interface OracleRequestBody {
  question: OracleQuestionType;
  profileExcerpt?: string;
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
}

studioRouter.post('/oracle', async (req: Request, res: Response) => {
  const body = req.body as OracleRequestBody;
  if (!body.question) {
    res.status(400).json({ error: 'question required (purpose | soulperson | turning_point)' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) {
    res.status(500).json({ error: `No API key for ${providerName}. Set ${config.envKey} on server or provide key in Settings.` });
    return;
  }

  const model = body.model || config.defaultModel;
  const { system, user } = buildOraclePrompt(body.question, body.profileExcerpt ?? '');

  try {
    let parsed: Record<string, unknown>;
    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, system, user) as Record<string, unknown>;
    } else {
      parsed = await callChatCompletions(config, apiKey, model, system, user) as Record<string, unknown>;
    }
    const answer = typeof parsed.answer === 'string' ? parsed.answer : JSON.stringify(parsed);
    res.json({ question: body.question, answer });
  } catch (err) {
    res.status(500).json({ error: `Oracle-Aufruf fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` });
  }
});
