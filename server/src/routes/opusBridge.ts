import { and, asc, eq, gt } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { getDb } from '../db.js';
import { runScoutPhase } from '../lib/opusScoutRunner.js';
import {
  DEFAULT_ROUNDTABLE_CONFIG,
  runRoundtable,
  validatePatch,
  type PatchValidation,
  type RoundtableConfig,
} from '../lib/opusRoundtable.js';
import { builderTasks } from '../schema/builder.js';
import { builderChatpool, builderOpusLog } from '../schema/opusBridge.js';

export const opusBridgeRouter = Router();

opusBridgeRouter.use(requireOpusToken);

opusBridgeRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const {
      instruction,
      scope,
      risk,
      opusHints,
      skipRoundtable,
      roundtableConfig,
    } = req.body as {
      instruction?: string;
      scope?: string[];
      risk?: string;
      opusHints?: string;
      skipRoundtable?: boolean;
      roundtableConfig?: Partial<RoundtableConfig>;
    };

    if (!instruction || typeof instruction !== 'string') {
      res.status(400).json({ error: 'instruction is required' });
      return;
    }

    const normalizedScope = Array.isArray(scope) ? scope : [];
    const db = getDb();
    const [task] = await db
      .insert(builderTasks)
      .values({
        title: instruction.slice(0, 100),
        goal: instruction,
        scope: normalizedScope,
        risk: risk ?? 'low',
        status: 'scouting',
      })
      .returning();

    const scoutMessages = await runScoutPhase({
      id: task.id,
      goal: instruction,
      scope: normalizedScope,
    });

    let status: 'consensus' | 'no_consensus' | 'validation_failed' | 'scouted' | 'error' = 'scouted';
    let consensusType: 'unanimous' | 'majority' | null = null;
    let rounds = 0;
    let totalTokens = 0;
    let patches: Array<{ file: string; body: string }> = [];
    let patchValidation: PatchValidation | null = null;
    let approvals: string[] = [];
    let blocks: string[] = [];

    if (!skipRoundtable) {
      const mergedConfig: RoundtableConfig = {
        participants: roundtableConfig?.participants ?? DEFAULT_ROUNDTABLE_CONFIG.participants,
        maxRounds: roundtableConfig?.maxRounds ?? DEFAULT_ROUNDTABLE_CONFIG.maxRounds,
        consensusThreshold:
          roundtableConfig?.consensusThreshold ?? DEFAULT_ROUNDTABLE_CONFIG.consensusThreshold,
      };

      const roundtableResult = await runRoundtable(
        {
          id: task.id,
          title: task.title,
          goal: task.goal,
          scope: normalizedScope,
          risk: risk ?? 'low',
        },
        scoutMessages,
        mergedConfig,
        opusHints,
      );

      rounds = roundtableResult.rounds;
      totalTokens = roundtableResult.totalTokens;
      patches = roundtableResult.patches;
      approvals = roundtableResult.approvals;
      blocks = roundtableResult.blocks;
      consensusType = roundtableResult.consensusType ?? null;

      if (roundtableResult.status === 'consensus') {
        if (patches.length > 0) {
          patchValidation = await validatePatch(
            patches,
            { goal: instruction, scope: normalizedScope },
            [
              ...scoutMessages.map((message) => `[${message.actor}] ${message.content}`),
            ].join('\n\n'),
          );
        }

        const hasCriticalIssues = patchValidation?.issues.some((issue) => issue.severity === 'critical') ?? false;
        status = patchValidation && !patchValidation.passed && hasCriticalIssues ? 'validation_failed' : 'consensus';
      } else if (roundtableResult.status === 'no_consensus') {
        status = 'no_consensus';
      } else {
        status = 'error';
      }
    }

    await db
      .update(builderTasks)
      .set({
        status,
        tokenCount: totalTokens,
        updatedAt: new Date(),
      })
      .where(eq(builderTasks.id, task.id));

    await db.insert(builderOpusLog).values({
      action: 'execute',
      taskId: task.id,
      input: { instruction, scope: normalizedScope, opusHints: opusHints ?? null },
      output: {
        status,
        rounds,
        totalTokens,
        approvals,
        blocks,
        patchValidation: patchValidation ?? null,
      },
      tokensUsed: totalTokens,
    });

    const storedRoundtableMessages = await db
      .select()
      .from(builderChatpool)
      .where(and(eq(builderChatpool.taskId, task.id), gt(builderChatpool.round, 0)))
      .orderBy(asc(builderChatpool.round), asc(builderChatpool.createdAt));

    res.json({
      taskId: task.id,
      status,
      title: task.title,
      consensusType,
      rounds,
      totalTokens,
      scoutMessages: scoutMessages.map((message) => ({
        actor: message.actor,
        content: message.content.slice(0, 500),
      })),
      roundtableMessages: storedRoundtableMessages.map((message) => ({
        actor: message.actor,
        round: message.round,
        content: message.content.slice(0, 500),
      })),
      patches,
      patchValidation,
      approvals,
      blocks,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/observe/:taskId', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.post('/override/:taskId', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.post('/chain', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.get('/audit', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.post('/worker-direct', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.get('/memory', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});