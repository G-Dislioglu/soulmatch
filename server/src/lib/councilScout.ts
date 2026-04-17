import { callProvider } from './providers.js';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ScoutFindings {
  repoContext: string;
  webInsights: string;
  aicosCards: string;
  crushStructure: string;
  durationMs: number;
}

interface AicosCard {
  id: string;
  type: string;
  title: string;
  domain: string;
  tags: string[];
  status: string;
  impact: string;
  score_summary: string;
  fixes: string[];
}

// ─── AICOS Card Search ───────────────────────────────────────────────────────

async function searchAicosCards(topic: string): Promise<string> {
  try {
    const resp = await fetch(
      'https://raw.githubusercontent.com/G-Dislioglu/aicos-registry/master/index/INDEX.json',
    );
    if (!resp.ok) return '[AICOS nicht erreichbar]';

    const cards: AicosCard[] = await resp.json();
    const topicLower = topic.toLowerCase();
    const keywords = topicLower.split(/\s+/).filter((w) => w.length > 3);

    // Score each card by keyword matches in title, tags, domain
    const scored = cards
      .map((card) => {
        const searchText = [
          card.title,
          card.domain,
          ...(card.tags || []),
          card.impact || '',
        ]
          .join(' ')
          .toLowerCase();

        let score = 0;
        for (const kw of keywords) {
          if (searchText.includes(kw)) score++;
        }
        return { card, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length === 0) return '[Keine relevanten AICOS-Karten gefunden]';

    return scored
      .map(
        (s) =>
          `- **${s.card.id}** (${s.card.type}): ${s.card.title}\n  Domain: ${s.card.domain} | Tags: ${(s.card.tags || []).join(', ')}\n  Impact: ${s.card.impact || 'k.A.'}\n  Fixes: ${(s.card.fixes || []).join('; ') || 'k.A.'}`,
      )
      .join('\n\n');
  } catch (err) {
    return `[AICOS-Fehler: ${String(err).substring(0, 100)}]`;
  }
}

// ─── Gemini Web Scout (with Google Search Grounding) ─────────────────────────

async function webScout(topic: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return '[Kein GEMINI_API_KEY — Web-Scout uebersprungen]';

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Recherchiere Best Practices und bekannte Probleme zu folgendem Thema. Fasse die wichtigsten 5 Erkenntnisse zusammen, jeweils mit Quelle. Antworte auf Deutsch.\n\nThema: ${topic}`,
              },
            ],
          },
        ],
        tools: [{ google_search_retrieval: {} }],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.3,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return `[Web-Scout Fehler: HTTP ${resp.status} — ${errText.substring(0, 150)}]`;
    }

    const data = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('') || '[Keine Antwort]';

    return text;
  } catch (err) {
    return `[Web-Scout Fehler: ${String(err).substring(0, 150)}]`;
  }
}

// ─── Repo Scout (reads relevant files via provider) ──────────────────────────

async function repoScout(topic: string, context: string): Promise<string> {
  try {
    // Use a fast model to identify which files to read
    const analysis = await callProvider('openrouter', 'z-ai/glm-5-turbo', {
      system:
        'Du bist ein Code-Scout. Analysiere das Thema und den Kontext und identifiziere die 3-5 wichtigsten Dateien die ein Entwickler lesen muss bevor er das Feature baut. Erklaere fuer jede Datei WAS relevant ist und WARUM. Halte dich kurz — maximal 300 Worte. Antworte auf Deutsch.',
      messages: [
        {
          role: 'user',
          content: `Thema: ${topic}\n\nKontext: ${context}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 1000,
      forceJsonObject: false,
    });

    return analysis;
  } catch (err) {
    return `[Repo-Scout Fehler: ${String(err).substring(0, 150)}]`;
  }
}

// ─── Crush-Zerlegung ─────────────────────────────────────────────────────────

async function crushProblem(
  topic: string,
  context: string,
  scoutData: string,
): Promise<string> {
  try {
    const crush = await callProvider('openrouter', 'z-ai/glm-5-turbo', {
      system: `Du bist ein Crush-Analyst. Wende die Crush-Methodik an um das Problem systematisch zu zerlegen.

Verwende diese Operatoren:
- SPLIT: Zerlege in unabhaengige Teilprobleme
- LAYER: Identifiziere Abstraktionsebenen (UI → State → DOM → CSS)
- CONNECT: Zeige Abhaengigkeiten zwischen Teilen
- SIGNIFY: Benenne das Kernproblem in einem Satz

Format:
### SIGNIFY
[Kernproblem in einem Satz]

### SPLIT
1. [Teilproblem 1]
2. [Teilproblem 2]
...

### LAYER
- UI-Schicht: ...
- State-Schicht: ...
- DOM-Schicht: ...
- CSS-Schicht: ...

### CONNECT
- [A] haengt ab von [B] weil ...

Maximal 400 Worte. Antworte auf Deutsch.`,
      messages: [
        {
          role: 'user',
          content: `Thema: ${topic}\n\nKontext: ${context}\n\nScout-Daten:\n${scoutData}`,
        },
      ],
      temperature: 0.4,
      maxTokens: 1500,
      forceJsonObject: false,
    });

    return crush;
  } catch (err) {
    return `[Crush-Fehler: ${String(err).substring(0, 150)}]`;
  }
}

// ─── Main Scout Function ─────────────────────────────────────────────────────

export async function runScoutPhase(
  topic: string,
  context: string,
): Promise<ScoutFindings> {
  const start = Date.now();

  // Run repo scout, web scout, and AICOS search in parallel
  const [repoContext, webInsights, aicosCards] = await Promise.all([
    repoScout(topic, context),
    webScout(topic),
    searchAicosCards(topic),
  ]);

  // Crush uses scout data, so runs after
  const scoutData = `Repo:\n${repoContext}\n\nWeb:\n${webInsights}\n\nAICOS:\n${aicosCards}`;
  const crushStructure = await crushProblem(topic, context, scoutData);

  return {
    repoContext,
    webInsights,
    aicosCards,
    crushStructure,
    durationMs: Date.now() - start,
  };
}
