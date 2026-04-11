import { getUserMemoryContext } from './memoryService.js';

interface BuilderContextAssemblerOptions {
  userId?: string;
  taskId: string;
  lane: string;
  phase: string;
}

export async function assembleBuilderContext(options: BuilderContextAssemblerOptions): Promise<string> {
  const { userId, taskId, lane, phase } = options;

  let conversationContext = '';
  // TODO: Wenn userId vorhanden, rufe await getUserMemoryContext(userId) auf. Bei Fehler console.warn und Fallback. Ohne userId bleibt es leer.
  if (userId) {
    try {
      conversationContext = await getUserMemoryContext(userId);
    } catch (error) {
      console.warn('[builderContextAssembler] Failed to get user memory context:', error);
      conversationContext = '';
    }
  }

  const contextParts: string[] = [];

  if (conversationContext) {
    contextParts.push(conversationContext);
  }

  // Lane-specific context
  contextParts.push(`[LANE: ${lane.toUpperCase()}]`);
  contextParts.push(`[PHASE: ${phase.toUpperCase()}]`);

  // Task reference
  contextParts.push(`[TASK: ${taskId}]`);

  return contextParts.join('\n\n');
}
