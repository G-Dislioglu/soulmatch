import type { StudioSeat } from '../../../shared/types/studio';
import type { MemoryEntryType, Sentiment } from './userMemory';

// ── Client-side Insight Extractor ──
// Lightweight keyword/pattern matching to extract memory entries
// from user messages and persona responses.
// No LLM call required — runs synchronously after each exchange.

interface ExtractedInsight {
  type: MemoryEntryType;
  persona: StudioSeat | 'system';
  summary: string;
  tags: string[];
  sentiment: Sentiment;
}

// ── Topic patterns (DE + EN) ──
const TOPIC_PATTERNS: { pattern: RegExp; tags: string[]; theme: string }[] = [
  { pattern: /\b(beziehung|partner|liebe|relationship|love|ehe|marriage)\b/i, tags: ['relationship', 'love'], theme: 'Beziehung & Partnerschaft' },
  { pattern: /\b(familie|family|eltern|parents|mutter|vater|kind|children|geschwister)\b/i, tags: ['family'], theme: 'Familie' },
  { pattern: /\b(arbeit|job|karriere|career|beruf|work|chef|boss|kollege)\b/i, tags: ['career', 'work'], theme: 'Beruf & Karriere' },
  { pattern: /\b(angst|fear|sorge|worry|panik|panic|phobi)\b/i, tags: ['anxiety', 'fear'], theme: 'Ängste & Sorgen' },
  { pattern: /\b(trauer|grief|verlust|loss|tod|death|sterben|vermiss)\b/i, tags: ['grief', 'loss'], theme: 'Trauer & Verlust' },
  { pattern: /\b(selbstwert|self-worth|selbstbewusst|confidence|unsicher|insecure)\b/i, tags: ['self-worth'], theme: 'Selbstwert' },
  { pattern: /\b(zukunft|future|ziel|goal|traum|dream|plan|wunsch|wish)\b/i, tags: ['future', 'goals'], theme: 'Zukunft & Ziele' },
  { pattern: /\b(spiritua|meditat|chakra|astrolog|numerolog|karma|seele|soul)\b/i, tags: ['spirituality'], theme: 'Spiritualität' },
  { pattern: /\b(sex|erotik|intimität|intimacy|lust|desire|körper|body)\b/i, tags: ['intimacy', 'body'], theme: 'Intimität & Körper' },
  { pattern: /\b(gesundheit|health|krank|illness|therapie|therapy|depression|burn.?out)\b/i, tags: ['health', 'mental-health'], theme: 'Gesundheit' },
  { pattern: /\b(geld|money|finanzen|finance|schulden|debt)\b/i, tags: ['finances'], theme: 'Finanzen' },
  { pattern: /\b(einsamkeit|lonel|allein|alone|isolat)\b/i, tags: ['loneliness'], theme: 'Einsamkeit' },
  { pattern: /\b(wut|anger|ärger|frustrat|aggress|hass|hate)\b/i, tags: ['anger'], theme: 'Wut & Frustration' },
  { pattern: /\b(vertrauen|trust|betrug|betrayal|lüge|lie|ehrlich|honest)\b/i, tags: ['trust'], theme: 'Vertrauen' },
  { pattern: /\b(veränderung|change|neuanfang|new.?start|umbruch|transition)\b/i, tags: ['change', 'transition'], theme: 'Veränderung' },
];

// ── Sentiment detection ──
const SENTIMENT_PATTERNS: { pattern: RegExp; sentiment: Sentiment }[] = [
  { pattern: /\b(danke|thank|freue|happy|schön|beautiful|toll|great|super|wunderbar|wonderful)\b/i, sentiment: 'positive' },
  { pattern: /\b(warum|why|wie|how|was ist|what is|erkläre?|explain|verstehe nicht|don't understand)\b/i, sentiment: 'curious' },
  { pattern: /\b(aber|but|stimmt nicht|disagree|nein|no|falsch|wrong|quatsch|nonsense)\b/i, sentiment: 'defensive' },
  { pattern: /\b(hilfe|help|bitte|please|weiß nicht|don't know|überfordert|overwhelmed|verzweifelt|desperate)\b/i, sentiment: 'vulnerable' },
  { pattern: /\b(traurig|sad|wein|cry|schmerz|pain|leid|suffer|einsam|lonely)\b/i, sentiment: 'distressed' },
  { pattern: /\b(fick|fuck|scheiß|shit|arsch|ass|idiot|dumm|stupid|halt.*maul|shut.*up)\b/i, sentiment: 'hostile' },
];

function detectSentiment(text: string): Sentiment {
  for (const { pattern, sentiment } of SENTIMENT_PATTERNS) {
    if (pattern.test(text)) return sentiment;
  }
  return 'neutral';
}

function detectTopics(text: string): { tags: string[]; themes: string[] } {
  const tags: string[] = [];
  const themes: string[] = [];
  for (const { pattern, tags: t, theme } of TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      tags.push(...t);
      themes.push(theme);
    }
  }
  return { tags: [...new Set(tags)], themes: [...new Set(themes)] };
}

/**
 * Extract insights from a user–persona exchange.
 * Returns 0-2 insights depending on content richness.
 */
export function extractInsights(
  userText: string,
  personaText: string,
  persona: StudioSeat,
): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];
  const combined = userText + ' ' + personaText;

  // 1. Topic detection → theme entry
  const { tags, themes } = detectTopics(combined);
  if (themes.length > 0) {
    const userSentiment = detectSentiment(userText);
    insights.push({
      type: 'theme',
      persona,
      summary: `Thema besprochen: ${themes.join(', ')}`,
      tags,
      sentiment: userSentiment,
    });
  }

  // 2. If user shows vulnerability or distress → insight entry
  const userSentiment = detectSentiment(userText);
  if (userSentiment === 'vulnerable' || userSentiment === 'distressed') {
    const topicHint = tags.length > 0 ? ` (Kontext: ${tags.slice(0, 3).join(', ')})` : '';
    insights.push({
      type: 'insight',
      persona,
      summary: `User zeigt ${userSentiment === 'vulnerable' ? 'Verletzlichkeit' : 'Belastung'}${topicHint}`,
      tags: [...tags, userSentiment],
      sentiment: userSentiment,
    });
  }

  // 3. If user expresses a preference or value
  const prefMatch = userText.match(/\b(ich (?:mag|liebe|hasse|brauche|will|möchte)|i (?:like|love|hate|need|want))\b\s+(.{5,40})/i);
  if (prefMatch) {
    insights.push({
      type: 'preference',
      persona,
      summary: `User-Präferenz: "${prefMatch[0].trim().slice(0, 60)}"`,
      tags: ['preference', ...tags.slice(0, 2)],
      sentiment: detectSentiment(userText),
    });
  }

  // Cap at 2 insights per exchange to avoid flooding
  return insights.slice(0, 2);
}

/**
 * Check if this is a milestone moment (first chat, long conversation, etc.)
 */
export function checkMilestone(
  messageCount: number,
  persona: StudioSeat,
): ExtractedInsight | null {
  if (messageCount === 1) {
    return {
      type: 'milestone',
      persona,
      summary: `Erster Chat mit ${persona}`,
      tags: ['first-chat', persona],
      sentiment: 'curious',
    };
  }
  if (messageCount === 20) {
    return {
      type: 'milestone',
      persona,
      summary: `Tiefes Gespräch mit ${persona} (20+ Nachrichten)`,
      tags: ['deep-chat', persona],
      sentiment: 'positive',
    };
  }
  return null;
}
