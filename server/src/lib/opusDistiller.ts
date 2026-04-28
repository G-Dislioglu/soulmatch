/**
 * opusDistiller.ts — Scout-Output Destillierer
 *
 * Zwei KIs arbeiten sequentiell:
 * 1. Extractor (GLM FlashX): Fakten-Extrakt aus allen Scout-Outputs
 * 2. Reasoner (DeepSeek): Crush-Analyse (IL/SE/AN) auf den Extrakt
 *
 * Beide sehen die Ausgabe des anderen und produzieren gemeinsam
 * einen Structured Brief (max 1200 Tokens) fuer den Council.
 */

import fs from 'node:fs';
import path from 'node:path';
import { callProvider } from './providers.js';
import { addChatPoolMessage, type ChatPoolMessage } from './opusChatPool.js';
import type { ScoutPhaseResult } from './opusScoutRunner.js';
import { getAllFromPool, type ResolvedModel } from './poolState.js';
import { buildTeamAwarenessBrief } from './builderTeamAwareness.js';

export interface DistillerResult {
  /** The final structured brief for the council */
  brief: string;
  /** ChatPool messages created during distillation */
  messages: ChatPoolMessage[];
  /** Token cost estimate */
  tokensUsed: number;
  durationMs: number;
}

// ─── Distiller KI Configuration ───
// Defaults used when pool is empty. Otherwise reads from activePools.distiller.
const DEFAULT_EXTRACTOR: ResolvedModel = { id: 'glm-flash', provider: 'openrouter', model: 'z-ai/glm-4.7-flash' };
const DEFAULT_REASONER: ResolvedModel = { id: 'deepseek-scout', provider: 'deepseek', model: 'deepseek-chat' };

const USER_INTENT_ANCHOR = [
  'KRITISCHE REGEL: Der User-Auftrag ist die Wahrheit.',
  '- Funktionsnamen, Variablennamen und Parameter aus dem User-Input MUESSEN exakt uebernommen werden.',
  '- Du darfst NICHT bestehende Funktionsnamen aus dem Code als "Korrektur" einsetzen.',
  '- Wenn der User "getWorstPerformers" schreibt, heisst die Funktion "getWorstPerformers" — nicht "getTopPerformers".',
  '- Bestehender Code ist KONTEXT, nicht VORLAGE. Der User-Auftrag hat Vorrang.',
].join('\n');

function resolveDistillerModels(): { extractor: ResolvedModel; reasoner: ResolvedModel } {
  const poolModels = getAllFromPool('distiller');
  if (poolModels.length === 0) {
    return { extractor: DEFAULT_EXTRACTOR, reasoner: DEFAULT_REASONER };
  }
  if (poolModels.length === 1) {
    // Single model does both roles
    return { extractor: poolModels[0]!, reasoner: poolModels[0]! };
  }
  // First = extractor, second = reasoner
  return { extractor: poolModels[0]!, reasoner: poolModels[1]! };
}

function buildScoutDigest(scoutResult: ScoutPhaseResult): string {
  const sections: string[] = [];

  for (const output of scoutResult.rawOutputs) {
    sections.push(`=== ${output.actor.toUpperCase()} (${output.model}, Fokus: ${output.focus}) ===`);
    sections.push(output.content);
    sections.push('');
  }

  return sections.join('\n').trim();
}

function extractReferencedFunctionName(taskGoal: string): string | null {
  const patterns = [
    /`([A-Za-z_$][A-Za-z0-9_$]*)`/,
    /"([A-Za-z_$][A-Za-z0-9_$]*)"/,
    /\b(?:fuege|füge|erstelle|implementiere|add|create|rename|benenne|ändere|aendere)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/i,
    /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:hinzu|implementieren|erstellen)\b/i,
  ];

  for (const pattern of patterns) {
    const match = taskGoal.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function extractRelevantFilesFromDigest(scoutDigest: string): string[] {
  const matches = scoutDigest.match(/(?:server|client)\/src\/[A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx)/g) ?? [];
  return [...new Set(matches)];
}

function functionExistsInScopeFiles(functionName: string, scoutDigest: string): boolean {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declarationPattern = new RegExp(
    `(?:async\\s+function\\s+${escapedName}\\s*\\(|function\\s+${escapedName}\\s*\\(|const\\s+${escapedName}\\s*=|let\\s+${escapedName}\\s*=|var\\s+${escapedName}\\s*=|export\\s+async\\s+function\\s+${escapedName}\\s*\\(|export\\s+function\\s+${escapedName}\\s*\\(|export\\s+const\\s+${escapedName}\\s*=)`,
    'i',
  );

  for (const filePath of extractRelevantFilesFromDigest(scoutDigest)) {
    for (const base of [process.cwd(), path.resolve(process.cwd(), '..')]) {
      const resolved = path.resolve(base, filePath);
      if (!fs.existsSync(resolved)) {
        continue;
      }

      try {
        const content = fs.readFileSync(resolved, 'utf-8');
        if (declarationPattern.test(content)) {
          return true;
        }
      } catch {
        // Ignore unreadable files and continue with remaining candidates.
      }
    }
  }

  return declarationPattern.test(scoutDigest);
}

function injectDuplicateFunctionHint(brief: string, taskGoal: string, scoutDigest: string): string {
  const functionName = extractReferencedFunctionName(taskGoal);
  if (!functionName || !functionExistsInScopeFiles(functionName, scoutDigest)) {
    return brief;
  }

  const warning = 'ACHTUNG: Eine Funktion mit diesem Namen existiert bereits. Pruefe ob der Auftrag eine NEUE Funktion meint oder eine Aenderung der bestehenden.';
  const lines = brief.split('\n');
  const taskLineIndex = lines.findIndex((line) => line.startsWith('TASK:'));

  if (taskLineIndex === -1) {
    return `${brief}\n${warning}`;
  }

  if (lines.some((line) => line.includes(warning))) {
    return brief;
  }

  lines.splice(taskLineIndex + 1, 0, warning);
  return lines.join('\n');
}

/**
 * Phase 1: Extractor — Fakten-Extrakt
 * GLM FlashX extrahiert die harten Fakten aus den Scout-Outputs:
 * Dateipfade, Patterns, Risiken, Zahlen.
 */
async function runExtractor(
  taskId: string,
  taskGoal: string,
  scoutDigest: string,
  model: ResolvedModel,
  teamBriefing?: string,
): Promise<{ message: ChatPoolMessage; extract: string }> {
  const startedAt = Date.now();

  const content = await callProvider(model.provider, model.model, {
    system: `${USER_INTENT_ANCHOR}

${teamBriefing ? `${teamBriefing}\n` : ''}

Du bist der Fakten-Extraktor im Destillierer. Du bekommst die Roh-Outputs von mehreren Scouts.
Dein Job: Extrahiere NUR die harten, verwertbaren Fakten. Kein Kommentar, keine Meinung.

Liefere exakt dieses Format:

KONTEXT: [2-3 Saetze was der Code aktuell macht]
DATEIEN: [Pfade mit Zeilennummern, eine pro Zeile]
PATTERNS: [Gefundene Code-Konventionen, Naming, Struktur]
RISIKEN: [Was koennte brechen, Abhaengigkeiten]
AEHNLICHE LOESUNGEN: [Was existiert schon, was kann wiederverwendet werden]
KOMPLEXITAET: [einfach/mittel/komplex + 1 Satz Begruendung]

Maximal 500 Woerter. Keine Wiederholungen. Jeder Satz muss Information enthalten.`,
    messages: [{
      role: 'user',
      content: `TASK: ${taskGoal}\n\n--- SCOUT-OUTPUTS ---\n${scoutDigest}`,
    }],
    maxTokens: 1000,
    forceJsonObject: false,
  });

  const message = await addChatPoolMessage({
    taskId,
    round: 0,
    phase: 'distiller',
    actor: 'distiller-extract',
    model: model.model,
    content,
    executionResults: { step: 'extract', poolId: model.id },
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });

  return { message, extract: content };
}

/**
 * Phase 2: Reasoner — Crush-Analyse
 * DeepSeek sieht den Fakten-Extrakt UND die Roh-Scout-Outputs.
 * Wendet Crush-Operatoren an: IL (Inverse Logik), SE (Schwachstellen),
 * AN (Analogie) und formt den finalen Structured Brief.
 */
async function runReasoner(
  taskId: string,
  taskGoal: string,
  extractorOutput: string,
  scoutDigest: string,
  model: ResolvedModel,
  teamBriefing?: string,
): Promise<{ message: ChatPoolMessage; brief: string }> {
  const startedAt = Date.now();

  const content = await callProvider(model.provider, model.model, {
    system: `${USER_INTENT_ANCHOR}

${teamBriefing ? `${teamBriefing}\n` : ''}

Du bist der Crush-Analyst im Destillierer. Du bekommst:
1. Den Fakten-Extrakt eines Kollegen
2. Die Original-Scout-Outputs

Dein Job: Wende drei Denkoperatoren an und forme den finalen Brief fuer den Council.

DENKOPERATOREN:
- IL (Inverse Logik): Was waere wenn der naheliegendste Ansatz FALSCH ist? Gibt es einen besseren?
- SE (Schwachstellen-Erkennung): Welche Luecken hat der Extrakt? Was wurde uebersehen?
- AN (Analogie): Wo im Projekt wurde ein aehnliches Problem schon geloest?

Liefere den FINALEN BRIEF in exakt diesem Format:

---BRIEF-START---
TASK: [1 Satz was gebaut werden soll]
KONTEXT: [3 Saetze max — was der Code aktuell macht]
RELEVANTE DATEIEN:
- [pfad:zeile — was dort relevant ist]
AEHNLICHE LOESUNGEN: [Was existiert, was wiederverwenden — Reuse-First!]
RISIKEN: [Top 3, priorisiert]
EMPFEHLUNG: [2-3 Saetze — der beste Ansatz und warum]
CRUSH-NOTIZ: [1 Satz — was IL/SE/AN zusaetzlich aufgedeckt hat]
---BRIEF-ENDE---

Der Brief muss in sich geschlossen verstaendlich sein — der Council sieht NUR diesen Brief, nicht die Scout-Outputs.
Maximal 600 Woerter.`,
    messages: [{
      role: 'user',
      content: `TASK: ${taskGoal}

--- FAKTEN-EXTRAKT (Kollege) ---
${extractorOutput}

--- ORIGINAL SCOUT-OUTPUTS (zur Gegenpruefung) ---
${scoutDigest}`,
    }],
    maxTokens: 1200,
    forceJsonObject: false,
  });

  const message = await addChatPoolMessage({
    taskId,
    round: 0,
    phase: 'distiller',
    actor: 'distiller-reason',
    model: model.model,
    content,
    executionResults: { step: 'reason', poolId: model.id },
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });

  // Extract the brief between markers, fallback to full content
  const briefMatch = content.match(/---BRIEF-START---([\s\S]*?)---BRIEF-ENDE---/);
  const rawBrief = briefMatch ? briefMatch[1]!.trim() : content;
  const brief = injectDuplicateFunctionHint(rawBrief, taskGoal, scoutDigest);

  return { message, brief };
}

/**
 * Run the full distillation pipeline:
 * Scout Outputs → Extractor (GLM FlashX) → Reasoner (DeepSeek) → Structured Brief
 */
export async function runDistiller(
  taskId: string,
  taskGoal: string,
  scoutResult: ScoutPhaseResult,
  memoryContext?: string,
): Promise<DistillerResult> {
  const startedAt = Date.now();
  const messages: ChatPoolMessage[] = [];
  const { extractor, reasoner } = resolveDistillerModels();

  // Build the scout digest string
  const scoutDigest = buildScoutDigest(scoutResult);
  const [extractorTeamBrief, reasonerTeamBrief] = await Promise.all([
    buildTeamAwarenessBrief({
      role: 'distiller',
      actorId: extractor.id,
      taskGoal,
      scope: [],
    }).catch(() => ''),
    buildTeamAwarenessBrief({
      role: 'distiller',
      actorId: reasoner.id,
      taskGoal,
      scope: [],
    }).catch(() => ''),
  ]);

  // Step 1: Extractor (pool model #1)
  console.log(`[distiller] Step 1: Extractor (${extractor.model})`);
  const { message: extractMsg, extract } = await runExtractor(taskId, taskGoal, scoutDigest, extractor, extractorTeamBrief);
  messages.push(extractMsg);

  // Step 2: Reasoner (pool model #2, sees extract + scouts + memory)
  console.log(`[distiller] Step 2: Reasoner (${reasoner.model})`);
  const enrichedDigest = memoryContext
    ? `${scoutDigest}\n\n--- MEMORY-KONTEXT (Error-Patterns, aehnliche Tasks) ---\n${memoryContext}`
    : scoutDigest;
  const { message: reasonMsg, brief } = await runReasoner(taskId, taskGoal, extract, enrichedDigest, reasoner, reasonerTeamBrief);
  messages.push(reasonMsg);

  const durationMs = Date.now() - startedAt;
  console.log(`[distiller] Complete in ${durationMs}ms. Brief: ${brief.length} chars`);

  return {
    brief,
    messages,
    tokensUsed: 0,
    durationMs,
  };
}
