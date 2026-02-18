import { Router } from 'express';
import type { Request, Response } from 'express';
import { STUDIO_RESULT_SCHEMA } from '../studioSchema.js';
import { buildSystemPrompt, buildSoloSystemPrompt, buildUserPrompt, buildOraclePrompt } from '../studioPrompt.js';
import type { LilithIntensity, OracleQuestionType } from '../studioPrompt.js';
import { devLogger } from '../devLogger.js';
import { applyNarrativeGate } from '../lib/studioQuality.js';
import { buildStudioAnchors, renderAnchorInstructionBlock } from '../lib/studioAnchors.js';
import { NARRATIVE_FAIL_FIXTURE, NARRATIVE_PASS_FIXTURE } from '../shared/narrative/examples.js';

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
    defaultModel: 'gpt-4.1-nano',
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
    defaultModel: 'grok-4-1-fast-reasoning',
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
