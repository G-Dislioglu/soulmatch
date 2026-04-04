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

function parsePrototypeKind(value: string | undefined): 'html' | 'react' {
  return value === 'react' ? 'react' : 'html';
}

export async function executePrototype(
  taskId: string,
  command: BdlCommand,
): Promise<PrototypeResult> {
  const kind = parsePrototypeKind(command.params.kind);
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
        html: body,
        interactive: command.params.interactive === 'true',
      },
    })
    .returning({ id: builderArtifacts.id });

  return {
    taskId,
    kind,
    saved: true,
    artifactId: artifact?.id ?? null,
  };
}

export async function getPrototypeHtml(taskId: string): Promise<string | null> {
  const db = getDb();
  const [artifact] = await db
    .select({ jsonPayload: builderArtifacts.jsonPayload })
    .from(builderArtifacts)
    .where(and(
      eq(builderArtifacts.taskId, taskId),
      eq(builderArtifacts.artifactType, 'prototype'),
    ))
    .orderBy(desc(builderArtifacts.createdAt))
    .limit(1);

  const payload = artifact?.jsonPayload as Record<string, unknown> | null | undefined;
  return typeof payload?.html === 'string' ? payload.html : null;
}

export async function promotePrototype(
  taskId: string,
  approved: string[],
  exclude: string[],
): Promise<{ promoted: boolean; notes: string }> {
  const db = getDb();
  const [sourceArtifact] = await db
    .select({
      id: builderArtifacts.id,
      jsonPayload: builderArtifacts.jsonPayload,
    })
    .from(builderArtifacts)
    .where(and(
      eq(builderArtifacts.taskId, taskId),
      eq(builderArtifacts.artifactType, 'prototype'),
    ))
    .orderBy(desc(builderArtifacts.createdAt))
    .limit(1);

  if (!sourceArtifact) {
    return { promoted: false, notes: 'No prototype artifact found' };
  }

  const payload = sourceArtifact.jsonPayload as Record<string, unknown> | null | undefined;
  const kind = typeof payload?.kind === 'string' ? payload.kind : 'html';
  const html = typeof payload?.html === 'string' ? payload.html : '';
  const interactive = payload?.interactive === true;

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
      kind,
      html,
      interactive,
    },
  });

  await db
    .update(builderTasks)
    .set({ status: 'planning', updatedAt: new Date() })
    .where(eq(builderTasks.id, taskId));

  return { promoted: true, notes: 'Promoted to code lane' };
}