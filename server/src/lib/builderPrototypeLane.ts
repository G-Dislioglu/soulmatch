import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderArtifacts, builderTasks } from '../schema/builder.js';
import type { BdlCommand } from './builderBdlParser.js';

export interface PrototypeResult {
  taskId: string;
  kind: 'html' | 'react';
  saved: boolean;
  artifactId: string | null;
  error?: string;
}

type PrototypePayload = {
  kind?: unknown;
  html?: unknown;
  interactive?: unknown;
};

function getPrototypeKind(command: BdlCommand): 'html' | 'react' {
  return command.params.kind === 'react' ? 'react' : 'html';
}

async function getLatestPrototypeArtifact(taskId: string) {
  const db = getDb();
  const [artifact] = await db
    .select()
    .from(builderArtifacts)
    .where(and(
      eq(builderArtifacts.taskId, taskId),
      eq(builderArtifacts.artifactType, 'prototype'),
    ))
    .orderBy(desc(builderArtifacts.createdAt))
    .limit(1);

  return artifact ?? null;
}

export async function executePrototype(
  taskId: string,
  command: BdlCommand,
): Promise<PrototypeResult> {
  const kind = getPrototypeKind(command);
  const body = command.body?.trim() ?? '';

  if (!body) {
    return {
      taskId,
      kind,
      saved: false,
      artifactId: null,
      error: 'No prototype body',
    };
  }

  const db = getDb();
  const [artifact] = await db
    .insert(builderArtifacts)
    .values({
      taskId,
      artifactType: 'prototype',
      lane: 'prototype',
      path: `/builder/preview/${taskId}`,
      jsonPayload: {
        kind,
        html: command.body,
        interactive: command.params.interactive === 'true',
      },
    })
    .returning({ id: builderArtifacts.id });

  return {
    taskId,
    kind,
    saved: Boolean(artifact?.id),
    artifactId: artifact?.id ?? null,
  };
}

export async function getPrototypeHtml(taskId: string): Promise<string | null> {
  const artifact = await getLatestPrototypeArtifact(taskId);
  if (!artifact) {
    return null;
  }

  const payload = artifact.jsonPayload as PrototypePayload | null;
  return typeof payload?.html === 'string' ? payload.html : null;
}

export async function promotePrototype(
  taskId: string,
  approved: string[],
  exclude: string[],
): Promise<{ promoted: boolean; notes: string }> {
  const sourceArtifact = await getLatestPrototypeArtifact(taskId);
  if (!sourceArtifact) {
    return { promoted: false, notes: 'No prototype artifact found' };
  }

  const db = getDb();
  await db.insert(builderArtifacts).values({
    taskId,
    artifactType: 'promoted_prototype',
    lane: 'prototype',
    path: `/builder/preview/${taskId}`,
    jsonPayload: {
      approved,
      exclude,
      sourceArtifactId: sourceArtifact.id,
      promotedAt: new Date().toISOString(),
    },
  });

  await db
    .update(builderTasks)
    .set({ status: 'planning', updatedAt: new Date() })
    .where(eq(builderTasks.id, taskId));

  return { promoted: true, notes: 'Promoted to code lane' };
}