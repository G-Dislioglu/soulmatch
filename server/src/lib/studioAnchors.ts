export interface StudioAnchor {
  id: string;
  label: string;
  value: string;
}

function sanitizeAnchorValue(raw: string): string {
  return raw
    .replace(/[^\w\säöüÄÖÜß.,:/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function pushAnchor(list: StudioAnchor[], label: string, value: string): void {
  const cleaned = sanitizeAnchorValue(value);
  if (!cleaned) return;
  const nextIndex = list.length + 1;
  list.push({
    id: `A${nextIndex}`,
    label,
    value: cleaned,
  });
}

function findFirstMatch(pattern: RegExp, source: string, groupIndex = 1): string | null {
  const match = pattern.exec(source);
  return match?.[groupIndex] ?? null;
}

/**
 * Minimal deterministic anchor extraction for PR-03.
 * Uses available profile/match excerpts to produce stable anchor tokens for Studio responses.
 */
export function buildStudioAnchors(input: {
  profileExcerpt?: string;
  matchExcerpt?: string;
  userMessage: string;
}): StudioAnchor[] {
  const anchors: StudioAnchor[] = [];
  const profile = input.profileExcerpt ?? '';
  const match = input.matchExcerpt ?? '';
  const corpus = `${profile}\n${match}`;

  const zodiac = findFirstMatch(/\b(sternzeichen|zodiac)\s*[:=]\s*([a-zäöüß]+)/i, corpus, 2);
  if (zodiac) pushAnchor(anchors, 'zodiac', zodiac);

  const lifePath = findFirstMatch(/\b(life\s*path|lebenszahl)\s*[:=]\s*(\d{1,2})/i, corpus, 2);
  if (lifePath) pushAnchor(anchors, 'life_path', lifePath);

  const score = findFirstMatch(/\b(score|compatibility|kompatibilit[aä]t)\s*[:=]?\s*(\d{1,3})/i, corpus, 2);
  if (score) pushAnchor(anchors, 'score', score);

  // Always include message-theme anchor as deterministic fallback so PR-03 anchor flow is testable.
  const trimmedMessage = input.userMessage.trim().slice(0, 100);
  if (trimmedMessage.length > 0) {
    pushAnchor(anchors, 'user_theme', trimmedMessage);
  }

  if (anchors.length < 2) {
    const intentWords = input.userMessage
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, 6)
      .join(' ')
      .slice(0, 80);
    pushAnchor(anchors, 'user_intent', intentWords || 'follow_up');
  }

  return anchors.slice(0, 4);
}

export function renderAnchorInstructionBlock(anchors: StudioAnchor[]): string {
  if (anchors.length === 0) return '';

  const lines = anchors.map((anchor) => `${anchor.id}: ${anchor.label}=${anchor.value}`);

  return [
    'DATA ANCHORS (nutze diese als Faktenbasis):',
    ...lines,
    'Gib im JSON ein Feld "anchorsUsed" als Array zurück (z.B. ["A1", "A2"]).',
    'Regel: anchorsUsed muss mindestens zwei IDs enthalten und nur IDs aus der obigen Liste verwenden.',
  ].join('\n');
}
