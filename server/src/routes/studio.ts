import { Router } from 'express';
import type { Request, Response } from 'express';
import { STUDIO_RESULT_SCHEMA } from '../studioSchema.js';
import { buildSystemPrompt, buildUserPrompt } from '../studioPrompt.js';

export const studioRouter = Router();

interface StudioRequestBody {
  studioRequest: {
    mode: 'profile' | 'match';
    profileId?: string;
    matchKey?: string;
    userMessage: string;
    seats: string[];
    maxTurns: number;
  };
  profileExcerpt?: string;
  matchExcerpt?: string;
}

studioRouter.post('/studio', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured on server.' });
    return;
  }

  const body = req.body as StudioRequestBody;
  if (!body.studioRequest?.userMessage) {
    res.status(400).json({ error: 'Missing studioRequest.userMessage' });
    return;
  }

  const { studioRequest, profileExcerpt, matchExcerpt } = body;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    mode: studioRequest.mode,
    profileExcerpt,
    matchExcerpt,
    userMessage: studioRequest.userMessage,
    seats: studioRequest.seats,
  });

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: studioRequest.mode === 'match' ? 'gpt-4o-mini' : 'gpt-4o-mini',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        text: {
          format: {
            type: 'json_schema',
            json_schema: STUDIO_RESULT_SCHEMA,
          },
        },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI API error:', openaiRes.status, errText);
      res.status(502).json({
        error: `OpenAI API returned ${openaiRes.status}`,
        detail: errText,
      });
      return;
    }

    const openaiData = await openaiRes.json() as {
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
    };

    // Extract text from Responses API output
    let resultText: string | undefined;
    if (openaiData.output) {
      for (const item of openaiData.output) {
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

    if (!resultText) {
      console.error('No text in OpenAI response:', JSON.stringify(openaiData));
      res.status(502).json({ error: 'No text content in OpenAI response' });
      return;
    }

    const parsed = JSON.parse(resultText);

    // Basic validation
    if (!parsed.turns || !Array.isArray(parsed.turns) || !parsed.nextSteps || !parsed.watchOut) {
      res.status(502).json({ error: 'OpenAI response did not match StudioResult schema' });
      return;
    }

    // Ensure meta reflects LLM
    parsed.meta = {
      engine: 'llm',
      engineVersion: 'studio-1.0-openai',
      computedAt: new Date().toISOString(),
      warnings: parsed.meta?.warnings ?? [],
    };

    res.json(parsed);
  } catch (err) {
    console.error('Studio API error:', err);
    res.status(500).json({
      error: 'Internal server error during OpenAI call',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
