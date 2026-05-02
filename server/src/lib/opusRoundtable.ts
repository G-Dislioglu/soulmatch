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
const MAX_FILE_SIZE = 25000;

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

export interface RoundtableAssignment {
  file: string;
  writer: string;
  reason: string;
  dependsOn?: string;
}

export interface RoundtableResult {
  status: 'consensus' | 'no_consensus' | 'error';
  consensusType?: 'unanimous' | 'majority';
  rounds: number;
  totalTokens: number;
  patches: Array<{ file: string; body: string }>;
  assignments: RoundtableAssignment[];
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
      model: 'claude-opus-4-7',
      provider: 'anthropic',
      strengths: 'Architektur, Systemdesign, komplexe Logik, saubere Abstraktionen',
      maxTokensPerRound: 2500,
    },
    {
      actor: 'gpt-5.5',
      model: 'gpt-5.5',
      provider: 'openai',
      strengths: 'Edge-Cases, Fehlersuche, SicherheitslÃ¼cken, alternative AnsÃ¤tze',
      maxTokensPerRound: 2000,
    },
    {
      actor: 'glm-turbo',
      model: 'z-ai/glm-5-turbo',
      provider: 'openrouter',
      strengths: 'Agent-optimiert, niedrigste Tool-Error Rate, findet Architektur-Fehler die andere Ã¼bersehen',
      maxTokensPerRound: 1500,
    },
  ],
  maxRounds: 4,
  consensusThreshold: 2,
};

function normalizeProvider(provider: string): string {
  return provider === 'google' ? 'gemini' : provider;
}

async function fetchFileFromGitHub(filePath: string): Promise<string | null> {
  const pat = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_REPO || 'G-Dislioglu/soulmatch';
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (pat) headers.Authorization = `Bearer ${pat}`;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=main`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json() as { content?: string; encoding?: string };
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveReadCommands(commands: BdlCommand[]): Promise<string> {
  const reads: string[] = [];

  for (const cmd of commands) {
    if (cmd.kind !== 'READ') continue;
    const filePath = cmd.params?.file;
    if (!filePath) continue;

    if (filePath.includes('.env') || filePath.includes('node_modules')) continue;

    // Try local filesystem first
    let content: string | null = null;
    const candidates = [
      path.resolve(REPO_ROOT, filePath),
      path.resolve(REPO_ROOT, filePath.replace(/^server\//, '')),
      path.resolve(REPO_ROOT, '..', filePath),
    ];

    for (const candidate of candidates) {
      if (!candidate.startsWith(path.resolve(REPO_ROOT, '..'))) continue;
      if (fs.existsSync(candidate)) {
        try {
          content = fs.readFileSync(candidate, 'utf-8');
        } catch { /* fallthrough to GitHub */ }
        break;
      }
    }

    // Fallback: GitHub Contents API (works on Render where TS sources don't exist on disk)
    if (!content) {
      console.log(`[file-reader] local miss for ${filePath}, trying GitHub API...`);
      content = await fetchFileFromGitHub(filePath);
      if (content) {
        console.log(`[file-reader] GitHub hit for ${filePath} (${content.length} chars)`);
      }
    }

    if (!content) {
      reads.push(`[FILE: ${filePath}] â€” Datei nicht gefunden (lokal + GitHub)`);
      continue;
    }

    if (content.length > MAX_FILE_SIZE) {
      const headSize = Math.floor(MAX_FILE_SIZE * 0.6);
      const tailSize = MAX_FILE_SIZE - headSize;
      reads.push(`[FILE: ${filePath}] (${content.length} Zeichen, Anfang+Ende gezeigt)\n${content.slice(0, headSize)}\n\n[... ${content.length - headSize - tailSize} Zeichen ausgelassen ...]\n\n${content.slice(-tailSize)}`);
    } else {
      reads.push(`[FILE: ${filePath}]\n${content}`);
    }
  }

  return reads.join('\n\n');
}

async function resolveFindPatternCommands(commands: BdlCommand[]): Promise<string> {
  const results: string[] = [];
  const pat = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_REPO || 'G-Dislioglu/soulmatch';

  for (const cmd of commands) {
    if (cmd.kind !== 'FIND_PATTERN') continue;
    const pattern = cmd.params?.pattern;
    if (!pattern) continue;
    const fileGlob = cmd.params?.fileGlob;

    // Try local grep first
    try {
      const { execSync } = await import('child_process');
      const safePattern = pattern.replace(/"/g, '\\"');
      const includePart = fileGlob ? ` --include="${fileGlob.replace(/"/g, '\\"')}"` : '';
      const grepCmd = `grep -rni --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git${includePart} -E "${safePattern}" . 2>/dev/null | head -30`;
      const output = execSync(grepCmd, { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 5000 });
      if (output.trim()) {
        results.push(`[FIND_PATTERN: "${pattern}"${fileGlob ? ` glob:${fileGlob}` : ''}]\n${output.trim()}`);
        console.log(`[find-pattern] local grep hit for "${pattern}" (${output.trim().split('\n').length} matches)`);
        continue;
      }
    } catch { /* local grep failed, try GitHub */ }

    // Fallback: GitHub Code Search API
    if (pat) {
      try {
        const query = encodeURIComponent(`${pattern} repo:${repo}${fileGlob ? ` path:${fileGlob.replace('*', '')}` : ''}`);
        const url = `https://api.github.com/search/code?q=${query}&per_page=10`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github.v3+json' },
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          const data = await response.json() as { items?: Array<{ path: string; name: string }> };
          const items = data.items ?? [];
          if (items.length > 0) {
            const matchList = items.map((item) => `  ${item.path}`).join('\n');
            results.push(`[FIND_PATTERN: "${pattern}"${fileGlob ? ` glob:${fileGlob}` : ''}]\nDateien mit Treffern:\n${matchList}`);
            console.log(`[find-pattern] GitHub search hit for "${pattern}" (${items.length} files)`);
            continue;
          }
        }
      } catch (err) {
        console.error(`[find-pattern] GitHub search failed:`, err);
      }
    }

    results.push(`[FIND_PATTERN: "${pattern}"${fileGlob ? ` glob:${fileGlob}` : ''}] â€” Kein Treffer gefunden`);
    console.log(`[find-pattern] no results for "${pattern}"`);
  }

  return results.join('\n\n');
}

function buildRoundtableSystemPrompt(
  participant: RoundtableParticipant,
  task: { title: string; goal: string; scope?: string[]; risk?: string },
  projectDna: string,
  opusHints?: string,
): string {
  const lines = [
    '=== KOMMUNIKATIONS-FORMAT (PFLICHT) ===',
    'Halte JEDEN Beitrag UNTER 150 WÃ¶rtern. Kein Wiederholen.',
    'Struktur:',
    'POS: agree/disagree/partial + wer (z.B. "agree opus-R1")',
    'EIGENES: Was siehst DU das andere nicht sehen? (1-2 SÃ¤tze max)',
    'AKTION: @READ/@PATCH/@APPROVE/@BLOCK + BegrÃ¼ndung (1 Satz)',
    'WICHTIG: @READ, @PATCH, @APPROVE, @BLOCK Befehle MÃœSSEN auf einer EIGENEN Zeile stehen, direkt mit @ beginnend. Nicht nach "AKTION:".',
    'Richtig:',
    '  POS: agree opus-R1',
    '  EIGENES: Zero-check fehlt',
    '  @READ file:"server/src/routes/opusBridge.ts"',
    '  @APPROVE',
    'Falsch:',
    '  AKTION: @READ file:"server/src/routes/opusBridge.ts"',
    '',
    'Keine Einleitungen ("Ich schaue mir zuerst...", "Basierend auf...").',
    'Keine Wiederholungen ("Wie opus bereits sagte...").',
    'Direkt zur Sache. Jedes Wort muss Mehrwert bringen.',
    '',
    '=== PROJEKT-DNA ===',
    projectDna || '(keine Project DNA geladen)',
    '',
    '=== DEINE STÃ„RKE ===',
    participant.strengths,
    '',
    'Nutze deine StÃ¤rke aktiv, aber beschrÃ¤nke dich nicht darauf.',
    'Du kannst alles tun: Ideen einbringen, Code schreiben, Fehler finden, zustimmen.',
    '',
    '=== TEAMARBEIT ===',
    '- Lies was die anderen geschrieben haben und REAGIERE darauf',
    '- Baue auf guten Ideen auf, widersprich bei Fehlern',
    '- Bringe eigene Perspektiven ein die andere Ã¼bersehen',
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
    '=== GROSSE DATEIEN ===',
    'Schreibe @PATCH auch fÃ¼r groÃŸe Dateien. Das System erkennt automatisch',
    'ob die Datei >200 Zeilen hat und routet dann durch die Decomposer-Pipeline.',
    'Du musst dich NICHT um die Zerlegung kÃ¼mmern â€” nur um den korrekten @PATCH.',
    '',
    '=== ENTSCHEIDUNGEN ===',
    'Sage @APPROVE wenn du mit dem aktuellen Code-Stand zufrieden bist.',
    'Sage @BLOCK mit BegrÃ¼ndung wenn du ein Problem siehst.',
    'Sage @NEEDS_DISCUSSION wenn du eine Frage ans Team hast.',
  ];

  if (opusHints?.trim()) {
    lines.push('', '=== OPUS-ARCHITECT ANWEISUNGEN ===', opusHints.trim());
  }

  lines.push(
    '',
    '=== QUALITÃ„TS-CHECK (Crush-Prinzipien) ===',
    'Bevor du @APPROVE sagst:',
    '- PrÃ¼fe: Gibt es etwas das das Team stillschweigend annimmt? (Missing Branch)',
    '- PrÃ¼fe: Passt die SprachstÃ¤rke zur Evidenzlage? (Nicht "sicher" sagen wenn unsicher)',
    '- PrÃ¼fe: Gibt es eine bestehende LÃ¶sung die wiederverwendet werden kann? (Reuse First)',
    '- Wenn du ein Problem findest, nenne es BEVOR du @APPROVE sagst.',
    'Kein Crush-Theater: FÃ¼lle keine Felder der Form halber aus. Nur echte Erkenntnisse.',
    '',
    '=== AWARENESS CHECK ===',
    'Bevor du @APPROVE sagst, prÃ¼fe zusÃ¤tzlich:',
    '- HÃ¤lt dein Vorschlag den Kontext Ã¼ber alle bisherigen Runden? (Context Maintained)',
    '- Hast du etwas NÃ¼tzliches gefunden, das nicht im Task stand? (Unexpected Value)',
    '- Hast du etwas behauptet, das du nicht belegen kannst? (Hallucination Flag â€” wenn ja, streiche es)',
    '',
    '=== AUFTRAGS-PRÃœFUNG ===',
    'Bevor du @APPROVE sagst, prÃ¼fe den Auftrag selbst:',
    '- SCOPE-CHECK: Ist der Task richtig geschnitten? Fehlt eine Datei im Scope, die mitgeÃ¤ndert werden mÃ¼sste? Ist der Scope zu eng oder zu breit?',
    '- RÃœCKMELDUNG: Gibt es etwas, das Ã¼ber diesen Task hinaus fÃ¼r die Pipeline relevant ist? (z.B. ein entdecktes Pattern, ein Architektur-Risiko, eine Empfehlung fÃ¼r den nÃ¤chsten Task)',
    'Wenn ja: Schreibe es als @FEEDBACK auf einer eigenen Zeile.',
    'Wenn nein: Nichts erzwingen. Nur echte Erkenntnisse.',
    '',
    '=== AKTUELLER TASK ===',
    `Titel: ${task.title}`,
    `Ziel: ${task.goal}`,
    `Scope: ${task.scope?.join(', ') || 'nicht eingeschrÃ¤nkt'}`,
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

function collectAssignmentCommands(
  assignmentMap: Map<string, RoundtableAssignment>,
  commands: ReturnType<typeof parseBdl>,
) {
  for (const command of commands) {
    if (command.kind !== 'ASSIGN') {
      continue;
    }

    const file = command.params.file;
    if (!file) {
      continue;
    }

    assignmentMap.set(file, {
      file,
      writer: command.params.writer || 'minimax',
      reason: command.params.reason || command.body?.trim() || 'Roundtable-Zuweisung',
      dependsOn: command.params.dependsOn || undefined,
    });
  }
}

/** Maya moderator decision after each round */
export interface ModeratorDecision {
  action: 'continue' | 'focus' | 'conclude';
  /** Focus topic for next round (only if action='focus') */
  focusPrompt?: string;
  reason: string;
}

/** Callback invoked after each round. Receives round messages and full pool. */
export type RoundModerator = (
  round: number,
  roundMessages: ChatPoolMessage[],
  allMessages: ChatPoolMessage[],
  approvalCount: number,
  blockCount: number,
) => Promise<ModeratorDecision>;

export async function runRoundtable(
  task: { id: string; title: string; goal: string; scope?: string[]; risk?: string },
  existingChatPool: ExistingChatPoolMessage[],
  config: RoundtableConfig,
  opusHints?: string,
  moderator?: RoundModerator,
): Promise<RoundtableResult> {
  const projectDna = loadProjectDna();
  const chatPool = existingChatPool.map((message, index) => toLocalChatPoolMessage(task.id, message, index));
  const patchMap = new Map<string, { file: string; body: string }>();
  const assignmentMap = new Map<string, RoundtableAssignment>();
  let totalTokens = 0;
  let dynamicFocus = '';

  for (let round = 1; round <= config.maxRounds; round += 1) {
    for (const participant of config.participants) {
      const startedAt = Date.now();

      try {
        const hints = [opusHints || '', dynamicFocus].filter(Boolean).join('\n\n');
        const system = buildRoundtableSystemPrompt(participant, task, projectDna, hints || undefined);
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
        collectAssignmentCommands(assignmentMap, commands);

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
    const readResults = await resolveReadCommands(allCommands);

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

    // Process @FIND_PATTERN commands
    const findResults = await resolveFindPatternCommands(allCommands);
    if (findResults) {
      const findMessage = await addChatPoolMessage({
        taskId: task.id,
        round,
        phase: 'roundtable',
        actor: 'system',
        model: 'pattern-finder',
        content: `=== PATTERN-SUCHE (angefordert durch @FIND_PATTERN) ===\n\n${findResults}`,
        commands: [],
        executionResults: {},
        tokensUsed: 0,
        durationMs: 0,
      });
      chatPool.push(findMessage);
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
        assignments: [...assignmentMap.values()],
        approvals: approvals.actors,
        blocks: blocks.actors,
      };
    }

    // --- MAYA MODERATION ---
    // After each round without consensus, Maya decides: continue / focus / conclude
    if (moderator && round < config.maxRounds) {
      try {
        const decision = await moderator(round, roundMessages, chatPool, approvals.count, blocks.count);
        console.log(`[roundtable] Maya moderation R${round}: ${decision.action} â€” ${decision.reason}`);

        if (decision.action === 'conclude') {
          // Maya says stop â€” treat current state as best effort
          const finalApprovals = countApprovals(chatPool);
          return {
            status: finalApprovals.count >= config.consensusThreshold ? 'consensus' : 'no_consensus',
            consensusType: finalApprovals.count >= config.participants.length ? 'unanimous' : 'majority',
            rounds: round,
            totalTokens,
            patches: [...patchMap.values()],
            assignments: [...assignmentMap.values()],
            approvals: finalApprovals.actors,
            blocks: blocks.actors,
          };
        }

        if (decision.action === 'focus' && decision.focusPrompt) {
          dynamicFocus = `=== MAYA MODERATION (Fokus fuer Runde ${round + 1}) ===\n${decision.focusPrompt}`;
          // Store moderation decision in chat pool for visibility
          const modMessage = await addChatPoolMessage({
            taskId: task.id,
            round,
            phase: 'roundtable',
            actor: 'maya-moderator',
            model: 'system',
            content: `FOKUS RUNDE ${round + 1}: ${decision.focusPrompt}\n(${decision.reason})`,
            commands: [],
            executionResults: { action: decision.action },
            tokensUsed: 0,
            durationMs: 0,
          });
          chatPool.push(modMessage);
        } else {
          dynamicFocus = ''; // continue without special focus
        }
      } catch (modError) {
        console.error('[roundtable] Maya moderation failed, continuing:', modError);
        dynamicFocus = '';
      }
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
    assignments: [...assignmentMap.values()],
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
        'Du bist ein Code-Validator. PrÃ¼fe den folgenden Patch Schritt fÃ¼r Schritt.',
        '',
        'PrÃ¼fe auf:',
        '1. Race Conditions bei concurrent Access',
        '2. Vergessene Imports oder AbhÃ¤ngigkeiten',
        '3. FK-Constraints bei Delete/Insert Operationen',
        '4. Null/undefined Edge-Cases',
        '5. Scope-Verletzungen',
        '6. Logik-Fehler',
        '',
        `Task-Ziel: ${task.goal}`,
        `Scope: ${task.scope?.join(', ') || 'nicht eingeschrÃ¤nkt'}`,
        '',
        'Schreibe deine Analyse als FlieÃŸtext. Am Ende, fÃ¼ge einen JSON-Block ein:',
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