import { sql } from 'drizzle-orm';
import { getDb } from '../db.js';
import { callProvider } from './providers.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionMemory {
  topic_tags: string[];
  emotion_tone: 'positiv' | 'suchend' | 'schwierig' | 'klar' | 'gemischt';
  key_insight: string;
}

function cleanJsonResponse(text: string): string {
  return text.replace(/```json|```/g, '').trim();
}

function normalizeSessionMemory(parsed: unknown): SessionMemory {
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const validTones = new Set<SessionMemory['emotion_tone']>([
    'positiv',
    'suchend',
    'schwierig',
    'klar',
    'gemischt',
  ]);

  const topicTags = Array.isArray(obj.topic_tags)
    ? obj.topic_tags
        .map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
        .filter((v) => v.length > 0)
        .slice(0, 4)
    : [];

  const emotionToneRaw = typeof obj.emotion_tone === 'string' ? obj.emotion_tone.trim().toLowerCase() : '';
  const emotionTone = validTones.has(emotionToneRaw as SessionMemory['emotion_tone'])
    ? (emotionToneRaw as SessionMemory['emotion_tone'])
    : 'gemischt';

  const keyInsight = typeof obj.key_insight === 'string'
    ? obj.key_insight.trim().replace(/\s+/g, ' ').slice(0, 220)
    : '';

  return {
    topic_tags: topicTags,
    emotion_tone: emotionTone,
    key_insight: keyInsight,
  };
}

// Nach jeder Session aufrufen – async, blockiert nicht
export async function saveSessionMemory(
  userId: string,
  personaId: string,
  messages: Message[]
): Promise<void> {
  if (messages.length < 4) return;

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.content}`)
    .join('\n')
    .slice(0, 3000);

  const taggingPrompt = `
Analysiere dieses Gespräch kurz und extrahiere:

1. topic_tags: 1-4 Themen als einzelne Wörter (deutsch, kleingeschrieben)
   Mögliche Themen: entscheidung, beziehung, karriere, selbstwert, veränderung,
   verlust, liebe, angst, mut, klarheit, familie, geld, gesundheit, sinn, partnerschaft

2. emotion_tone: EINES von: positiv | suchend | schwierig | klar | gemischt

3. key_insight: 1 prägnanter Satz – die wichtigste Erkenntnis (max 15 Wörter)

Antworte NUR mit validem JSON, kein Markdown:
{"topic_tags": [], "emotion_tone": "", "key_insight": ""}

Gespräch:
${conversationText}
  `.trim();

  try {
    const response = await callProvider(
      'gemini',
      'gemini-2.5-flash-lite',
      {
        system: '',
        messages: [{ role: 'user', content: taggingPrompt }],
        temperature: 0.2,
        maxTokens: 200,
      }
    );

    const cleaned = cleanJsonResponse(response);
    const parsed = normalizeSessionMemory(JSON.parse(cleaned));

    if (!parsed.key_insight) return;

    const db = getDb();
    const topicTagsSql = parsed.topic_tags.length > 0
      ? sql`ARRAY[${sql.join(parsed.topic_tags.map((tag) => sql`${tag}`), sql`, `)}]::text[]`
      : sql`ARRAY[]::text[]`;

    await db.execute(sql`
      INSERT INTO session_memories
        (user_id, persona_id, topic_tags, emotion_tone, key_insight, message_count)
      VALUES (${userId}, ${personaId}, ${topicTagsSql}, ${parsed.emotion_tone}, ${parsed.key_insight}, ${messages.length})
    `);
  } catch (err) {
    console.error('[memoryService] saveSessionMemory error:', err);
  }
}

// Beim Session-Start aufrufen – gibt Kontext-String zurück
export async function getUserMemoryContext(userId: string): Promise<string> {
  try {
    const db = getDb();
    const memories = await db.execute(sql`
      SELECT topic_tags, emotion_tone, key_insight, session_date, persona_id
      FROM session_memories
      WHERE user_id = ${userId}
        AND session_date > NOW() - INTERVAL '90 days'
      ORDER BY session_date DESC
      LIMIT 20
    `);

    if (!memories.rows || memories.rows.length === 0) return '';

    const topicCount: Record<string, number> = {};
    memories.rows.forEach((row) => {
      const topicTags = Array.isArray((row as { topic_tags?: unknown }).topic_tags)
        ? ((row as { topic_tags: unknown[] }).topic_tags)
        : [];

      topicTags.forEach((tag) => {
        if (typeof tag !== 'string') return;
        const cleanedTag = tag.trim().toLowerCase();
        if (!cleanedTag) return;
        topicCount[cleanedTag] = (topicCount[cleanedTag] || 0) + 1;
      });
    });

    const topTopics = Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => `${topic} (${count}x)`)
      .join(', ');

    const lastRow = memories.rows[0] as {
      emotion_tone?: string;
      key_insight?: string;
    } | undefined;

    const lastTone = lastRow?.emotion_tone ?? '';
    const lastInsight = lastRow?.key_insight ?? '';
    const sessionCount = memories.rows.length;

    return `
[SYSTEM: GESPRÄCHS-GEDÄCHTNIS – letzte 90 Tage (${sessionCount} Sessions)
 Häufige Themen: ${topTopics || 'keine'}
 Zuletzt: ${lastTone} – "${lastInsight}"
 Nutze dieses Wissen subtil wenn es passt. Nie wie ein Protokoll klingen.]
    `.trim();
  } catch (err) {
    console.error('[memoryService] getUserMemoryContext error:', err);
    return '';
  }
}
