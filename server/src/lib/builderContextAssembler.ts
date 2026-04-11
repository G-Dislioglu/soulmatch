import { getUserMemoryContext } from './memoryService.js';

interface BuilderContextAssemblerOptions {
  userId?: string;
  taskId?: string;
  lane?: string;
  phase?: string;
}

export async function assembleBuilderContext(options: BuilderContextAssemblerOptions = {}): Promise<string> {
  const { userId, taskId, lane, phase } = options;

  let conversationContext = '';
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

  if (lane) {
    contextParts.push(`[LANE: ${lane.toUpperCase()}]`);
  }
  if (phase) {
    contextParts.push(`[PHASE: ${phase.toUpperCase()}]`);
  }
  if (taskId) {
    contextParts.push(`[TASK: ${taskId}]`);
  }

  return contextParts.join('\n\n');
}
