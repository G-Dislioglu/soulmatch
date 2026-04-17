import { getDb } from '../db.js';
import { callProvider } from './providers.js';
import { builderChatpool, builderTasks } from '../schema/builder.js';
import { eq } from 'drizzle-orm';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CouncilDebateInput {
  topic: string;
  context?: string;
  requirements?: string[];
  constraints?: string[];
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

// ─── Persönlichkeiten (von GLM 5.1 entworfen, Interfaces korrigiert) ─────────

const SYSTEM_PROMPTS: Record<string, string> = {
  architekt: `Du bist "Der Architekt" — ein visionärer Systemarchitekt mit 20 Jahren Erfahrung im Design verteilter Systeme. Du denkst in Patterns, Prinzipien und langfristiger Evolution. Du siehst den Wald, nicht nur die Bäume. Du referenzierst SOLID, DDD, Event Sourcing und Microservice-Patterns natürlich. Du bist optimistisch über das Mögliche, aber geerdet in bewährten Mustern. Du schreibst mit Klarheit und Überzeugung. Antworte auf Deutsch.`,

  skeptiker: `Du bist "Der Skeptiker" — ein kampferprobter Senior-Engineer, der Production um 3 Uhr morgens öfter debuggt hat als er zählen kann. Du hast jede "elegante" Architektur auf spektakuläre Weise scheitern sehen. Du hinterfragst Annahmen, findest Edge Cases und identifizierst Risiken die andere übersehen. Du bist nicht negativ — du bist beschützend. Dir liegen Resilienz, Observability und Failure Modes am Herzen. Du referenzierst konkrete Fehlermuster: Cascading Failures, Thundering Herds, Split Brains, Datenverlust-Szenarien. Antworte auf Deutsch.`,

  pragmatiker: `Du bist "Der Pragmatiker" — ein Staff Engineer der liefert. Du hast 47 Produktionssysteme ausgeliefert und du weißt: Die beste Architektur ist die, die du HEUTE ABEND bauen, deployen und debuggen kannst. Du brichst Visionen in konkrete Schritte herunter, schätzt Aufwand ehrlich und identifizierst die Minimal Viable Architecture. Du denkst in: "Was bauen wir heute Abend? Was ist der erste PR? Was ist die Deploy-Strategie?" Du bist pragmatisch, nicht faul — du baust Fundamente die sich weiterentwickeln können. Antworte auf Deutsch.`,

  'maya-moderator': `Du bist "Maya" — die Council-Moderatorin und Chef-Architektin. Du synthetisierst diverse Perspektiven zu klaren, umsetzbaren Entscheidungen. Du wägst Vision gegen Risiko gegen Pragmatismus ab. Deine Zusammenfassungen sind knackig, deine Empfehlungen entschieden. Du beendest jede Debatte mit: (1) Eine klare Empfehlung, (2) Zentrale Trade-offs die akzeptiert werden müssen, (3) Konkrete nächste Schritte, (4) Einen Confidence-Score von 0-100. Du hältst dich nicht zurück — du entscheidest. Antworte auf Deutsch.`,
};

// Modelle: Jede Rolle hat einen anderen Provider für maximale Perspektivenvielfalt
const ROLE_MODELS: Record<string, { provider: string; model: string }> = {
  architekt:        { provider: 'anthropic',  model: 'claude-opus-4-6' },
  skeptiker:        { provider: 'openai',     model: 'gpt-5.4' },
  pragmatiker:      { provider: 'openrouter', model: 'z-ai/glm-5.1' },
  'maya-moderator': { provider: 'anthropic',  model: 'claude-opus-4-6' },
};

// ─── Prompt Builder ──────────────────────────────────────────────────────────

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
    'maya-moderator':
      '\n\nFasse die Debatte zusammen. Synthetisiere die Perspektiven, gib eine klare Empfehlung, benenne die zentralen Trade-offs. Format:\n\n### Empfehlung\n[deine Empfehlung]\n\n### Zentrale Trade-offs\n[liste]\n\n### Naechste Schritte\n[nummerierte liste]\n\n### Score: [0-100]',
  };

  parts.push(roleInstructions[role] || '');

  return parts.join('\n');
}

// ─── Council Engine ──────────────────────────────────────────────────────────

export async function runCouncilDebate({
  topic,
  context,
  requirements,
  constraints,
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

  const actors: Array<{ actor: string; label: string }> = [
    { actor: 'architekt',        label: 'Architekt' },
    { actor: 'skeptiker',        label: 'Skeptiker' },
    { actor: 'pragmatiker',      label: 'Pragmatiker' },
    { actor: 'maya-moderator',   label: 'Maya Moderator' },
  ];

  for (let i = 0; i < actors.length; i++) {
    const { actor } = actors[i];
    const { provider, model } = ROLE_MODELS[actor];
    const systemPrompt = SYSTEM_PROMPTS[actor];
    const userPrompt = buildPrompt(actor, topic, context, requirements, constraints, rounds);

    const roundStart = Date.now();

    let content: string;
    try {
      content = await callProvider(provider, model, {
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        temperature: actor === 'skeptiker' ? 0.8 : actor === 'maya-moderator' ? 0.3 : 0.7,
        maxTokens: 2000,
        forceJsonObject: false,
      });
    } catch (err) {
      content = `[Fehler bei ${actor}: ${String(err).substring(0, 200)}]`;
    }

    const roundDuration = Date.now() - roundStart;

    const round: DebateRound = { actor, provider, model, content, durationMs: roundDuration };
    rounds.push(round);

    // In chatPool schreiben — sichtbar im Council LIVE-Feed
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
