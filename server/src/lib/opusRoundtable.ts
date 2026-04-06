import * as fs from 'fs';
import * as path from 'path';
import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import {
  addChatPoolMessage,
  countApprovals,
  countBlocks,
  formatChatPoolForModel,
  type ChatPoolMessage,
} from './opusChatPool.js';
import { loadProjectDna } from './opusGraphIntegration.js';
import { extractJsonFromText } from './opusPulseCrush.js';
import { callProvider } from './providers.js';

const REPO_ROOT = process.cwd();
const MAX_FILE_SIZE = 8000;

export interface RoundtableParticipant {
  actor: string;
  model: string;
  provider: string;
  strengths: string;
  maxTokensPerRound: number;
}

export interface RoundtableConfig {
  participants: RoundtableParticipant[];
  maxRounds: number;
  consensusThreshold: number;
}

export interface RoundtableResult {
  status: 'consensus' | 'no_consensus' | 'error';
  consensusType?: 'unanimous' | 'majority';
  rounds: number;
  totalTokens: number;
  patches: Array<{ file: string; body: string }>;
  approvals: string[];
  blocks: string[];
}

export interface PatchValidation {
  passed: boolean;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    description: string;
    file: string;
    suggestion?: string;
  }>;
  tokensUsed: number;
}

interface ExistingChatPoolMessage {
  round: number;
  phase: string;
  actor: string;
  model: string;
  content: string;
  commands?: unknown[];
  executionResults?: Record<string, unknown>;
  tokensUsed: number;
}

export const DEFAULT_ROUNDTABLE_CONFIG: RoundtableConfig = {
  participants: [
    {
      actor: 'opus',
      model: 'claude-opus-4-6',
      provider: 'anthropic',
      strengths: 'Architektur, Systemdesign, komplexe Logik, saubere Abstraktionen',
      maxTokensPerRound: 2500,
    },
    {
      actor: 'gpt-5.4',
      model: 'gpt-5.4',
      provider: 'openai',
      strengths: 'Edge-Cases, Fehlersuche, Sicherheitslücken, alternative Ansätze',
      maxTokensPerRound: 2000,
    },
    {
      actor: 'glm-turbo',
      model: 'glm-5-turbo',
      provider: 'zhipu',
      strengths: 'Agent-optimiert, niedrigste Tool-Error Rate, findet Architektur-Fehler die andere übersehen',
      maxTokensPerRound: 1500,
    },
  ],
  maxRounds: 4,
  consensusThreshold: 2,
};

function normalizeProvider(provider: string): string {
  return provider === 'google' ? 'gemini' : provider;
}

function resolveReadCommands(commands: BdlCommand[]): string {
  const reads: string[] = [];

  for (const cmd of commands) {
    if (cmd.kind !== 'READ') continue;
    const filePath = cmd.params?.file;
    if (!filePath) continue;

    if (filePath.includes('.env') || filePath.includes('node_modules')) continue;

    let resolved = '';
    let found = false;
    const candidates = [
      path.resolve(REPO_ROOT, filePath),
      path.resolve(REPO_ROOT, filePath.replace(/^server\//, '')),
      path.resolve(REPO_ROOT, '..', filePath),
    ];

    for (const candidate of candidates) {
      if (!candidate.startsWith(path.resolve(REPO_ROOT, '..'))) continue;
      if (fs.existsSync(candidate)) {
        resolved = candidate;
        found = true;
        break;
      }
    }

    if (!found) {
      reads.push(`[FILE: ${filePath}] — Datei nicht gefunden (geprüfte Pfade: ${candidates.map((candidate) => candidate.replace(REPO_ROOT, '.')).join(', ')})`);
      continue;
    }

    try {
      const content = fs.readFileSync(resolved, 'utf-8');
      if (content.length > MAX_FILE_SIZE) {
        reads.push(`[FILE: ${filePath}] (${content.length} Zeichen, gekürzt auf ${MAX_FILE_SIZE})\n${content.slice(0, MAX_FILE_SIZE)}\n[...gekürzt...]`);
      } else {
        reads.push(`[FILE: ${filePath}]\n${content}`);
      }
    } catch {
      reads.push(`[FILE: ${filePath}] — Datei nicht gefunden oder nicht lesbar`);
    }
  }

  return reads.join('\n\n');
}

function buildRoundtableSystemPrompt(
  participant: RoundtableParticipant,
  task: { title: string; goal: string; scope?: string[]; risk?: string },
  projectDna: string,
  opusHints?: string,
): string {
  const lines = [
    '=== PROJEKT-DNA ===',
    projectDna || '(keine Project DNA geladen)',
    '',
    '=== DEINE STÄRKE ===',
    participant.strengths,
    '',
    'Nutze deine Stärke aktiv, aber beschränke dich nicht darauf.',
    'Du kannst alles tun: Ideen einbringen, Code schreiben, Fehler finden, zustimmen.',
    '',
    '=== TEAMARBEIT ===',
    '- Lies was die anderen geschrieben haben und REAGIERE darauf',
    '- Baue auf guten Ideen auf, widersprich bei Fehlern',
    '- Bringe eigene Perspektiven ein die andere übersehen',
    '- Wiederhole nicht was schon gesagt wurde',
    '',
    '=== BDL-BEFEHLE ===',
    '@FIND_PATTERN pattern:"..." fileGlob:"..."',
    '@READ file:"..."',
    '@PATCH file:"pfad"',
    '<<<SEARCH',
    '...alter code...',
    '===REPLACE',
    '...neuer code...',
    '>>>',
    '@SEARCH query:"..." (nur wenn du Web-Zugang hast)',
    '',
    '=== ENTSCHEIDUNGEN ===',
    'Sage @APPROVE wenn du mit dem aktuellen Code-Stand zufrieden bist.',
    'Sage @BLOCK mit Begründung wenn du ein Problem siehst.',
    'Sage @NEEDS_DISCUSSION wenn du eine Frage ans Team hast.',
  ];

  if (opusHints?.trim()) {
    lines.push('', '=== OPUS-ARCHITECT ANWEISUNGEN ===', opusHints.trim());
  }

  lines.push(
    '',
    '=== QUALITÄTS-CHECK (Crush-Prinzipien) ===',
    'Bevor du @APPROVE sagst:',
    '- Prüfe: Gibt es etwas das das Team stillschweigend annimmt? (Missing Branch)',
    '- Prüfe: Passt die Sprachstärke zur Evidenzlage? (Nicht "sicher" sagen wenn unsicher)',
    '- Prüfe: Gibt es eine bestehende Lösung die wiederverwendet werden kann? (Reuse First)',
    '- Wenn du ein Problem findest, nenne es BEVOR du @APPROVE sagst.',
    'Kein Crush-Theater: Fülle keine Felder der Form halber aus. Nur echte Erkenntnisse.',
    '',
    '=== AWARENESS CHECK ===',
    'Bevor du @APPROVE sagst, prüfe zusätzlich:',
    '- Hält dein Vorschlag den Kontext über alle bisherigen Runden? (Context Maintained)',
    '- Hast du etwas Nützliches gefunden, das nicht im Task stand? (Unexpected Value)',
    '- Hast du etwas behauptet, das du nicht belegen kannst? (Hallucination Flag — wenn ja, streiche es)',
    '',
    '=== AKTUELLER TASK ===',
    `Titel: ${task.title}`,
    `Ziel: ${task.goal}`,
    `Scope: ${task.scope?.join(', ') || 'nicht eingeschränkt'}`,
    `Risiko: ${task.risk || 'low'}`,
  );

  return lines.join('\n');
}

function toLocalChatPoolMessage(taskId: string, message: ExistingChatPoolMessage, index: number): ChatPoolMessage {
  return {
    id: `existing-${index}`,
    taskId,
    round: message.round,
    phase: message.phase as ChatPoolMessage['phase'],
    actor: message.actor,
    model: message.model,
    content: message.content,
    commands: message.commands ?? [],
    executionResults: message.executionResults ?? {},
    tokensUsed: message.tokensUsed,
    durationMs: 0,
    createdAt: new Date(index),
  };
}

function collectPatchCommands(
  patchMap: Map<string, { file: string; body: string }>,
  commands: ReturnType<typeof parseBdl>,
) {
  for (const command of commands) {
    if (command.kind !== 'PATCH') {
      continue;
    }

    const file = command.params.file;
    const body = command.body?.trim();
    if (!file || !body) {
      continue;
    }

    patchMap.set(file, { file, body });
  }
}

export async function runRoundtable(
  task: { id: string; title: string; goal: string; scope?: string[]; risk?: string },
  existingChatPool: ExistingChatPoolMessage[],
  config: RoundtableConfig,
  opusHints?: string,
): Promise<RoundtableResult> {
  const projectDna = loadProjectDna();
  const chatPool = existingChatPool.map((message, index) => toLocalChatPoolMessage(task.id, message, index));
  const patchMap = new Map<string, { file: string; body: string }>();
  let totalTokens = 0;

  for (let round = 1; round <= config.maxRounds; round += 1) {
    for (const participant of config.participants) {
      const startedAt = Date.now();

      try {
        const system = buildRoundtableSystemPrompt(participant, task, projectDna, opusHints);
        const prompt = `${formatChatPoolForModel(chatPool)}\n\n--- Dein Beitrag (Runde ${round}): ---`;
        const response = await callProvider(
          normalizeProvider(participant.provider),
          participant.model,
          {
            system,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: participant.maxTokensPerRound,
            forceJsonObject: false,
          },
        );

        const commands = parseBdl(response);
        collectPatchCommands(patchMap, commands);

        const tokensUsed = Math.ceil(response.length / 4);
        totalTokens += tokensUsed;

        const storedMessage = await addChatPoolMessage({
          taskId: task.id,
          round,
          phase: 'roundtable',
          actor: participant.actor,
          model: participant.model,
          content: response,
          commands,
          executionResults: {},
          tokensUsed,
          durationMs: Date.now() - startedAt,
        });

        chatPool.push(storedMessage);
      } catch (error) {
        console.error(`[opusRoundtable] participant ${participant.actor} failed`, error);
      }
    }

    const roundMessages = chatPool.filter((message) => message.round === round);
    const allCommands = roundMessages.flatMap((message) =>
      Array.isArray(message.commands) ? message.commands as BdlCommand[] : [],
    );
    const readResults = resolveReadCommands(allCommands);

    if (readResults) {
      const readMessage = await addChatPoolMessage({
        taskId: task.id,
        round,
        phase: 'roundtable',
        actor: 'system',
        model: 'file-reader',
        content: `=== DATEI-INHALTE (angefordert durch @READ) ===\n\n${readResults}`,
        commands: [],
        executionResults: {},
        tokensUsed: 0,
        durationMs: 0,
      });
      chatPool.push(readMessage);
    }

    const approvals = countApprovals(chatPool, round);
    const blocks = countBlocks(chatPool, round);

    if (approvals.count >= config.consensusThreshold && blocks.count === 0) {
      return {
        status: 'consensus',
        consensusType: approvals.actors.length === config.participants.length ? 'unanimous' : 'majority',
        rounds: round,
        totalTokens,
        patches: [...patchMap.values()],
        approvals: approvals.actors,
        blocks: blocks.actors,
      };
    }
  }

  const finalRound = config.maxRounds;
  const finalApprovals = countApprovals(chatPool, finalRound);
  const finalBlocks = countBlocks(chatPool, finalRound);

  return {
    status: 'no_consensus',
    rounds: config.maxRounds,
    totalTokens,
    patches: [...patchMap.values()],
    approvals: finalApprovals.actors,
    blocks: finalBlocks.actors,
  };
}

function sanitizeIssues(input: unknown): PatchValidation['issues'] {
  if (!Array.isArray(input)) {
    return [];
  }

  const issues: PatchValidation['issues'] = [];

  for (const issue of input) {
    if (!issue || typeof issue !== 'object') {
      continue;
    }

    const issueRecord = issue as Record<string, unknown>;
    const severity = issueRecord.severity;
    const description = issueRecord.description;
    const file = issueRecord.file;
    const suggestion = issueRecord.suggestion;

    if (
      (severity !== 'critical' && severity !== 'warning' && severity !== 'info') ||
      typeof description !== 'string' ||
      typeof file !== 'string'
    ) {
      continue;
    }

    issues.push({
      severity,
      description,
      file,
      suggestion: typeof suggestion === 'string' ? suggestion : undefined,
    });
  }

  return issues;
}

export async function validatePatch(
  patches: Array<{ file: string; body: string }>,
  task: { goal: string; scope?: string[] },
  chatPoolSummary: string,
): Promise<PatchValidation> {
  if (patches.length === 0) {
    return { passed: true, issues: [], tokensUsed: 0 };
  }

  const patchDiff = patches
    .map((patch) => [`FILE: ${patch.file}`, patch.body].join('\n'))
    .join('\n\n');

  try {
    const response = await callProvider('deepseek', 'deepseek-reasoner', {
      system: [
        'Du bist ein Code-Validator. Prüfe den folgenden Patch Schritt für Schritt.',
        '',
        'Prüfe auf:',
        '1. Race Conditions bei concurrent Access',
        '2. Vergessene Imports oder Abhängigkeiten',
        '3. FK-Constraints bei Delete/Insert Operationen',
        '4. Null/undefined Edge-Cases',
        '5. Scope-Verletzungen',
        '6. Logik-Fehler',
        '',
        `Task-Ziel: ${task.goal}`,
        `Scope: ${task.scope?.join(', ') || 'nicht eingeschränkt'}`,
        '',
        'Schreibe deine Analyse als Fließtext. Am Ende, füge einen JSON-Block ein:',
        '{"passed": true/false, "issues": [{"severity":"...","description":"...","file":"...","suggestion":"..."}]}',
      ].join('\n'),
      messages: [{ role: 'user', content: `Team-Diskussion:\n${chatPoolSummary}\n\nPatch:\n${patchDiff}` }],
      maxTokens: 2000,
    });

    const tokensUsed = Math.ceil(response.length / 4);
    const parsed = extractJsonFromText(response);
    if (!parsed) {
      return {
        passed: true,
        issues: [],
        tokensUsed,
      };
    }
    const issues = sanitizeIssues(parsed.issues);

    return {
      passed: parsed.passed === true,
      issues,
      tokensUsed,
    };
  } catch (error) {
    console.error('[opusRoundtable] patch validation fallback:', error);
    return {
      passed: true,
      issues: [],
      tokensUsed: 0,
    };
  }
}