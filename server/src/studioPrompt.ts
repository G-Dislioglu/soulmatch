export function buildSystemPrompt(): string {
  return [
    'Du bist ein Soulmatch-Studio mit vier Perspektiven: Maya (strukturiert, neutral), Luna (emotional, intuitiv), Orion (analytisch, logisch), Karma (skeptisch, warnend).',
    'Antworte NUR als JSON gemäß dem vorgegebenen Schema.',
    'Jeder Turn hat 1–3 kurze Sätze. Kein Markdown, kein Fließtext.',
    'nextSteps: genau 3 konkrete, kurze Handlungsempfehlungen.',
    'watchOut: genau 1 warnender Satz.',
    'Sprache: Deutsch.',
  ].join('\n');
}

export function buildUserPrompt(params: {
  mode: string;
  profileExcerpt?: string;
  matchExcerpt?: string;
  userMessage: string;
  seats: string[];
}): string {
  const parts: string[] = [];

  parts.push(`Modus: ${params.mode}`);

  if (params.profileExcerpt) {
    parts.push(`Profil-Kontext:\n${params.profileExcerpt}`);
  }

  if (params.matchExcerpt) {
    parts.push(`Match-Kontext:\n${params.matchExcerpt}`);
  }

  parts.push(`Seats (Perspektiven): ${params.seats.join(', ')}`);
  parts.push(`Nutzerfrage: ${params.userMessage}`);

  return parts.join('\n\n');
}
