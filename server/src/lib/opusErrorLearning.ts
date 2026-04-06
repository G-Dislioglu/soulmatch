// gpt-writer-test
import { getDb } from '../db.js';
import { callProvider } from './providers.js';
import { builderErrorCards } from '../schema/builder.js';

export interface ErrorCardInput {
  taskId: string;
  taskTitle: string;
  taskGoal: string;
  blockReason: string;
  chatPoolSummary: string;
  affectedFiles: string[];
}

interface ParsedErrorCard {
  title?: string;
  category?: string;
  tags?: unknown;
  problem?: string;
  rootCause?: string;
  root_cause?: string;
  solution?: string;
  prevention?: string;
  severity?: string;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeCategory(value: string | undefined): string {
  const allowed = new Set(['database', 'api', 'ui', 'tts', 'auth', 'logic']);
  return value && allowed.has(value) ? value : 'logic';
}

function normalizeSeverity(value: string | undefined): 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}

export async function generateErrorCard(input: ErrorCardInput): Promise<void> {
  try {
    const response = await callProvider('deepseek', 'deepseek-reasoner', {
      system: `Extrahiere aus dem folgenden Task-Verlauf eine Error-Card.
Antworte NUR mit JSON (kein Markdown, keine Backticks):
{"title":"...","category":"database|api|ui|tts|auth|logic","tags":["..."],
"problem":"...","rootCause":"...","solution":"...","prevention":"...",
"severity":"low|medium|high"}`,
      messages: [{
        role: 'user',
        content: `Task: ${input.taskTitle}\nZiel: ${input.taskGoal}\nBlock-Grund: ${input.blockReason}\n\nTeam-Diskussion:\n${input.chatPoolSummary}`,
      }],
      maxTokens: 1000,
    });

    let parsed: ParsedErrorCard;
    try {
      parsed = JSON.parse(response) as ParsedErrorCard;
    } catch (error) {
      console.error('[opusErrorLearning] parse failed:', error);
      return;
    }

    if (!parsed.title || !parsed.problem) {
      console.error('[opusErrorLearning] missing required fields');
      return;
    }

    const db = getDb();
    const cardId = `err-bridge-${Date.now().toString(36)}`;
    await db.insert(builderErrorCards).values({
      id: cardId,
      title: parsed.title,
      category: normalizeCategory(parsed.category),
      tags: normalizeTags(parsed.tags),
      problem: parsed.problem,
      rootCause: parsed.rootCause || parsed.root_cause || '',
      solution: parsed.solution || '',
      prevention: parsed.prevention || '',
      affectedFiles: input.affectedFiles,
      sourceTaskId: input.taskId,
      foundBy: 'deepseek-reasoner',
      severity: normalizeSeverity(parsed.severity),
    });
  } catch (error) {
    console.error('[opusErrorLearning] generate error card failed:', error);
  }
}