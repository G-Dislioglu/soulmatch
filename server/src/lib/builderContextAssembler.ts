import { desc, ne } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderTasks } from '../schema/builder.js';
import { buildBuilderMemoryContext } from './builderMemory.js';

export interface BuilderContext {
  mayaMemory: string;
  operationalContext: string;
  conversationContext: string;
}

export async function assembleBuilderContext(userId?: string): Promise<BuilderContext> {
  // a) mayaMemory from buildBuilderMemoryContext with try/catch and fallback
  let mayaMemory: string;
  try {
    mayaMemory = await buildBuilderMemoryContext();
  } catch (error) {
    console.error('[builderContextAssembler] Error building memory context:', error);
    mayaMemory = 'Gedächtnis konnte nicht geladen werden.';
  }

  // b) operationalContext from active builder tasks (last 3 with status != done)
  let operationalContext: string;
  try {
    const db = getDb();
    const tasks = await db
      .select({
        title: builderTasks.title,
        status: builderTasks.status,
      })
      .from(builderTasks)
      .where(ne(builderTasks.status, 'done'))
      .orderBy(desc(builderTasks.createdAt))
      .limit(3);

    if (tasks.length === 0) {
      operationalContext = 'Keine aktiven Builder-Tasks vorhanden.';
    } else {
      operationalContext = tasks
        .map((t) => `- ${t.title}: ${t.status}`)
        .join('\n');
    }
  } catch (error) {
    console.error('[builderContextAssembler] Error fetching active tasks:', error);
    operationalContext = 'Operativer Kontext konnte nicht geladen werden.';
  }

  // c) conversationContext remains empty for now
  // TODO: Implement conversation context retrieval
  const conversationContext = '';

  return {
    mayaMemory,
    operationalContext,
    conversationContext,
  };
}
