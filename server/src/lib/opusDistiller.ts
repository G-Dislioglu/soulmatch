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

import { callProvider } from './providers.js';
import { addChatPoolMessage, type ChatPoolMessage } from './opusChatPool.js';
import type { ScoutPhaseResult } from './opusScoutRunner.js';

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
// These are fixed roles, not pool-dependent — the distiller always
// uses cheap/fast models for extraction + reasoning.
const EXTRACTOR = {
  provider: 'zhipu',
  model: 'glm-4.7-flashx',
  actor: 'distiller-extract',
};

const REASONER = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  actor: 'distiller-reason',
};

function buildScoutDigest(scoutResult: ScoutPhaseResult): string {
  const sections: string[] = [];

  for (const output of scoutResult.rawOutputs) {
    sections.push(`=== ${output.actor.toUpperCase()} (${output.model}, Fokus: ${output.focus}) ===`);
    sections.push(output.content);
    sections.push('');
  }

  return sections.join('\n').trim();
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
): Promise<{ message: ChatPoolMessage; extract: string }> {
  const startedAt = Date.now();

  const content = await callProvider(EXTRACTOR.provider, EXTRACTOR.model, {
    system: `Du bist der Fakten-Extraktor im Destillierer. Du bekommst die Roh-Outputs von mehreren Scouts.
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
    phase: 'scout',
    actor: EXTRACTOR.actor,
    model: EXTRACTOR.model,
    content,
    executionResults: { step: 'extract' },
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
): Promise<{ message: ChatPoolMessage; brief: string }> {
  const startedAt = Date.now();

  const content = await callProvider(REASONER.provider, REASONER.model, {
    system: `Du bist der Crush-Analyst im Destillierer. Du bekommst:
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

--- ORIGINAL SCOUT-OUTPUTS (zur Gegenprüfung) ---
${scoutDigest}`,
    }],
    maxTokens: 1200,
    forceJsonObject: false,
  });

  const message = await addChatPoolMessage({
    taskId,
    round: 0,
    phase: 'scout',
    actor: REASONER.actor,
    model: REASONER.model,
    content,
    executionResults: { step: 'reason' },
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });

  // Extract the brief between markers, fallback to full content
  const briefMatch = content.match(/---BRIEF-START---([\s\S]*?)---BRIEF-ENDE---/);
  const brief = briefMatch ? briefMatch[1]!.trim() : content;

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
): Promise<DistillerResult> {
  const startedAt = Date.now();
  const messages: ChatPoolMessage[] = [];

  // Build the scout digest string
  const scoutDigest = buildScoutDigest(scoutResult);

  // Step 1: Extractor
  console.log(`[distiller] Step 1: Extractor (${EXTRACTOR.model})`);
  const { message: extractMsg, extract } = await runExtractor(taskId, taskGoal, scoutDigest);
  messages.push(extractMsg);

  // Step 2: Reasoner (sees extract + original scouts)
  console.log(`[distiller] Step 2: Reasoner (${REASONER.model})`);
  const { message: reasonMsg, brief } = await runReasoner(taskId, taskGoal, extract, scoutDigest);
  messages.push(reasonMsg);

  const durationMs = Date.now() - startedAt;
  console.log(`[distiller] Complete in ${durationMs}ms. Brief: ${brief.length} chars`);

  return {
    brief,
    messages,
    tokensUsed: 0, // Will be populated when we add token tracking
    durationMs,
  };
}
