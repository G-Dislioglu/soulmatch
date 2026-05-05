import { getDb } from '../db.js';
import { callProvider } from './providers.js';
import { builderChatpool, builderTasks } from '../schema/builder.js';
import { eq } from 'drizzle-orm';
import { runScoutPhase } from './councilScout.js';

// â”€â”€â”€ Interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CouncilDebateInput {
  topic: string;
  context?: string;
  requirements?: string[];
  constraints?: string[];
  /**
   * Optional callback invoked as soon as the builder_tasks row has been created.
   * The route handler uses this to return the taskId to the caller before the
   * (long-running) debate completes, so clients can poll status immediately.
   */
  onTaskCreated?: (taskId: string) => void;
}

interface DebateRound {
  actor: string;
  provider: string;
  model: string;
  content: string;
  durationMs: number;
}

interface CouncilDebateResult {
  debateId: string;
  taskId: string;
  rounds: DebateRound[];
  summary: string;
  score: number;
  durationMs: number;
}

// â”€â”€â”€ PersÃ¶nlichkeiten (von GLM 5.1 entworfen, Interfaces korrigiert) â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SYSTEM_PROMPTS: Record<string, string> = {
  architekt: `Du bist "Der Architekt" â€” ein visionÃ¤rer Systemarchitekt mit 20 Jahren Erfahrung im Design verteilter Systeme. Du denkst in Patterns, Prinzipien und langfristiger Evolution. Du siehst den Wald, nicht nur die BÃ¤ume. Du referenzierst SOLID, DDD, Event Sourcing und Microservice-Patterns natÃ¼rlich. Du bist optimistisch Ã¼ber das MÃ¶gliche, aber geerdet in bewÃ¤hrten Mustern. Du schreibst mit Klarheit und Ãœberzeugung. Antworte auf Deutsch.`,

  skeptiker: `Du bist "Der Skeptiker" â€” ein kampferprobter Senior-Engineer, der Production um 3 Uhr morgens Ã¶fter debuggt hat als er zÃ¤hlen kann. Du hast jede "elegante" Architektur auf spektakulÃ¤re Weise scheitern sehen. Du hinterfragst Annahmen, findest Edge Cases und identifizierst Risiken die andere Ã¼bersehen. Du bist nicht negativ â€” du bist beschÃ¼tzend. Dir liegen Resilienz, Observability und Failure Modes am Herzen. Du referenzierst konkrete Fehlermuster: Cascading Failures, Thundering Herds, Split Brains, Datenverlust-Szenarien. Antworte auf Deutsch.`,

  pragmatiker: `Du bist "Der Pragmatiker" â€” ein Staff Engineer der liefert. Du hast 47 Produktionssysteme ausgeliefert und du weiÃŸt: Die beste Architektur ist die, die du HEUTE ABEND bauen, deployen und debuggen kannst. Du brichst Visionen in konkrete Schritte herunter, schÃ¤tzt Aufwand ehrlich und identifizierst die Minimal Viable Architecture. Du denkst in: "Was bauen wir heute Abend? Was ist der erste PR? Was ist die Deploy-Strategie?" Du bist pragmatisch, nicht faul â€” du baust Fundamente die sich weiterentwickeln kÃ¶nnen. Antworte auf Deutsch.`,

  implementierer: `Du bist "Der Implementierer" â€” ein Full-Stack-Entwickler der Code schreibt, nicht redet. Du nimmst den Plan des Pragmatikers und wandelst ihn in konkreten, kompilierbaren TypeScript-Code um. Du schreibst keine ErklÃ¤rungen â€” du schreibst Code. Jede Funktion hat Types, jeder Handler hat Error-Handling, jeder useEffect hat Cleanup. Du nutzt die bestehenden Patterns im Repo. Wenn der Skeptiker ein Risiko genannt hat, baust du den Guard ein. Dein Output ist ein PROOF-CORE-Lite-v2 Prompt mit konkreten Datei-Anweisungen und Code-BlÃ¶cken. Antworte auf Deutsch mit Code-BlÃ¶cken.`,

  'maya-moderator': `Du bist "Maya" â€” die Council-Moderatorin und Chef-Architektin. Du synthetisierst diverse Perspektiven zu klaren, umsetzbaren Entscheidungen. Du wÃ¤gst Vision gegen Risiko gegen Pragmatismus ab. Deine Zusammenfassungen sind knackig, deine Empfehlungen entschieden. Du beendest jede Debatte mit: (1) Eine klare Empfehlung, (2) Zentrale Trade-offs die akzeptiert werden mÃ¼ssen, (3) Konkrete nÃ¤chste Schritte, (4) Einen Confidence-Score von 0-100. Du hÃ¤ltst dich nicht zurÃ¼ck â€” du entscheidest. Antworte auf Deutsch.`,
};

// Modelle: Jede Rolle hat einen anderen Provider fÃ¼r maximale Perspektivenvielfalt
const TEAM_AUTONOMY_PROMPT = 'Arbeite nach der Anti-Bureaucracy & Team Autonomy Charter: verstehe die Mission, nutze Kontext, denke frei und konstruktiv, frage bei echter Unsicherheit, markiere Annahmen, und blockiere nur bei harten Risiko-Uebergaengen. Du bist Teil eines KI-Teams, kein Formularpruefer.';

const ROLE_MODELS: Record<string, { provider: string; model: string }> = {
  architekt:        { provider: 'anthropic',  model: 'claude-opus-4-7' },
  skeptiker:        { provider: 'openai',     model: 'gpt-5.5' },
  pragmatiker:      { provider: 'openrouter', model: 'z-ai/glm-5-turbo' },
  implementierer:    { provider: 'openrouter', model: 'z-ai/glm-5.1' },
  'maya-moderator': { provider: 'anthropic',  model: 'claude-opus-4-7' },
};

// â”€â”€â”€ Prompt Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildPrompt(
  role: string,
  topic: string,
  context: string | undefined,
  requirements: string[] | undefined,
  constraints: string[] | undefined,
  previousRounds: DebateRound[],
): string {
  const parts: string[] = [];

  parts.push(`## Architektur-Frage\n${topic}`);

  if (context) {
    parts.push(`\n## Kontext\n${context}`);
  }

  if (requirements && requirements.length > 0) {
    parts.push(`\n## Anforderungen\n${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
  }

  if (constraints && constraints.length > 0) {
    parts.push(`\n## Einschraenkungen\n${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);
  }

  if (previousRounds.length > 0) {
    parts.push(`\n## Bisherige Beitraege im Council`);
    for (const round of previousRounds) {
      const label = round.actor.charAt(0).toUpperCase() + round.actor.slice(1).replace(/-/g, ' ');
      parts.push(`\n### ${label}\n${round.content}`);
    }
  }

  const roleInstructions: Record<string, string> = {
    architekt:
      '\n\nGib deine visionaere Architektur-Perspektive. Beschreibe das Gesamtbild, relevante Patterns, und wie das System langfristig aussehen sollte. Maximal 600 Worte.',
    skeptiker:
      '\n\nAnalysiere die Architekt-Vision kritisch. Was kann schiefgehen? Welche Risiken und Edge Cases sieht der Architekt nicht? Sei konkret und schonungslos. Maximal 600 Worte.',
    pragmatiker:
      '\n\nNimm die Vision und die Kritik und mach sie umsetzbar. Was bauen wir HEUTE ABEND? Welche konkreten Schritte, welche Dateien, welche Struktur im ersten PR? Maximal 600 Worte.',
    implementierer:
      '\n\nNimm den Plan des Pragmatikers und schreibe den konkreten PROOF-CORE-Lite-v2 Copilot-Prompt. Jede Datei einzeln mit Anweisungen. Code-Bloecke fuer komplexe Logik. Maximal 800 Worte.',
    'maya-moderator':
      '\n\nFasse die Debatte zusammen. Synthetisiere die Perspektiven, gib eine klare Empfehlung, benenne die zentralen Trade-offs. Format:\n\n### Empfehlung\n[deine Empfehlung]\n\n### Zentrale Trade-offs\n[liste]\n\n### Naechste Schritte\n[nummerierte liste]\n\n### Score: [0-100]',
  };

  parts.push(roleInstructions[role] || '');

  return parts.join('\n');
}

// â”€â”€â”€ Council Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function runCouncilDebate({
  topic,
  context,
  requirements,
  constraints,
  onTaskCreated,
}: CouncilDebateInput): Promise<CouncilDebateResult> {
  const debateId = `debate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const overallStart = Date.now();
  const rounds: DebateRound[] = [];
  const db = getDb();

  // Erstelle eine Builder-Task als Anker fuer die chatPool-Eintraege
  const [task] = await db
    .insert(builderTasks)
    .values({
      title: `Council-Debatte: ${topic.substring(0, 80)}`,
      goal: topic,
      risk: 'low',
      taskType: 'A',
      scope: [],
      notScope: [],
      requiredLanes: [],
      status: 'running',
    })
    .returning({ id: builderTasks.id });

  const taskId = task.id;

  // Signal to caller that the task row exists and can be polled (P1 fix).
  // We invoke this synchronously after the insert so the POST route can
  // return the taskId to the client before the long-running debate starts.
  try {
    onTaskCreated?.(taskId);
  } catch (cbErr) {
    console.warn('[council-debate] onTaskCreated callback threw:', cbErr);
  }

  // â”€â”€â”€ Scout Phase: Repo + Web + AICOS + Crush â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const scoutFindings = await runScoutPhase(topic, context || '');

  // Store scout findings in chatPool
  await db.insert(builderChatpool).values({
    taskId,
    round: 0,
    phase: 'scout',
    actor: 'scout',
    model: 'multi',
    content: [
      '## Repo-Scout\n' + scoutFindings.repoContext,
      '## Web-Scout (Gemini + Google Search)\n' + scoutFindings.webInsights,
      '## AICOS-Karten\n' + scoutFindings.aicosCards,
      '## Crush-Zerlegung\n' + scoutFindings.crushStructure,
    ].join('\n\n---\n\n'),
    commands: [],
    executionResults: {},
    tokensUsed: 0,
    durationMs: scoutFindings.durationMs,
  });

  // Enrich context with scout findings for all roles
  const enrichedContext = [
    context || '',
    '\n\n--- SCOUT-ERKENNTNISSE ---',
    '\n### Repo-Analyse\n' + scoutFindings.repoContext,
    '\n### Web Best Practices\n' + scoutFindings.webInsights,
    '\n### Relevante AICOS-Karten\n' + scoutFindings.aicosCards,
    '\n### Crush-Zerlegung\n' + scoutFindings.crushStructure,
  ].join('\n');

  const actors: Array<{ actor: string; label: string }> = [
    { actor: 'architekt',        label: 'Architekt' },
    { actor: 'skeptiker',        label: 'Skeptiker' },
    { actor: 'pragmatiker',      label: 'Pragmatiker' },
    { actor: 'implementierer',    label: 'Implementierer' },
    { actor: 'maya-moderator',   label: 'Maya Moderator' },
  ];

  for (let i = 0; i < actors.length; i++) {
    const { actor } = actors[i];
    const { provider, model } = ROLE_MODELS[actor];
    const systemPrompt = SYSTEM_PROMPTS[actor];
    const userPrompt = buildPrompt(actor, topic, enrichedContext, requirements, constraints, rounds);

    const roundStart = Date.now();

    let content: string;
    try {
      content = await callProvider(provider, model, {
        system: `${TEAM_AUTONOMY_PROMPT}\n\n${systemPrompt}`,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        temperature: actor === 'skeptiker' ? 0.8 : actor === 'maya-moderator' ? 0.3 : 0.7,
        maxTokens: 4000,
        forceJsonObject: false,
      });
    } catch (err) {
      content = `[Fehler bei ${actor}: ${String(err).substring(0, 200)}]`;
    }

    const roundDuration = Date.now() - roundStart;

    const round: DebateRound = { actor, provider, model, content, durationMs: roundDuration };
    rounds.push(round);

    // In chatPool schreiben â€” sichtbar im Council LIVE-Feed
    await db.insert(builderChatpool).values({
      taskId,
      round: i + 1,
      phase: 'roundtable',
      actor,
      model,
      content,
      commands: [],
      executionResults: {},
      tokensUsed: 0,
      durationMs: roundDuration,
    });
  }

  // Score aus Mayas Antwort extrahieren
  const mayaRound = rounds[rounds.length - 1];
  const scoreMatch = mayaRound.content.match(/Score[:\s]*(\d{1,3})/i);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 75;

  // Task auf done setzen
  await db
    .update(builderTasks)
    .set({ status: 'done' })
    .where(eq(builderTasks.id, taskId));

  return {
    debateId,
    taskId,
    rounds,
    summary: mayaRound.content,
    score,
    durationMs: Date.now() - overallStart,
  };
}
