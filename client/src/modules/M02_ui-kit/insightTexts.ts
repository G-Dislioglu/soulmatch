/**
 * Discovery Flow — Insight enrichment data.
 *
 * Maps claim-ID prefixes (from the scoring engine) to rich text for the
 * expandable cards: a 3-4 sentence `detail`, a short italic `mayaWhisper`,
 * and an array of `relatedTo` claim-prefix slugs used for the "related
 * cards glow" effect.
 *
 * For MVP the texts are static templates keyed by the claim-ID prefix
 * (e.g. "NUM_LIFEPATH").  In a future version the LLM will generate
 * personalised texts at scoring time.
 */

export interface InsightEnrichment {
  detail: string;
  mayaWhisper: string;
  relatedTo: string[];
}

/**
 * Canonical slug used as the discovery-card identifier.
 * Derived from the ExplainClaim.id prefix (everything before the last `_`
 * segment that is a number).
 */
export type InsightSlug =
  | 'life-path'
  | 'expression'
  | 'soul-urge'
  | 'personality'
  | 'aspects-harmony'
  | 'aspects-tension'
  | 'angles'
  | 'planets'
  | 'fusion-high'
  | 'fusion-divergence'
  | 'fusion-master';

const TEXTS: Record<string, InsightEnrichment> = {
  'life-path': {
    detail:
      'Dein Lebensweg steht im Zeichen der Unabhängigkeit und Führung. Du bist jemand, der eigene Wege geht – manchmal auf Kosten von Teamfähigkeit. Das bringt dir Punkte, weil Eigeninitiative in Beziehungen Klarheit schafft.',
    mayaWhisper:
      'Dein Life Path kombiniert mit deinem Soul Urge – doppelte Unabhängigkeit. Das erklärt einiges...',
    relatedTo: ['soul-urge'],
  },
  'expression': {
    detail:
      'Deine Expression macht dich zum Denker und Analytiker. Du wirkst auf andere tiefgründig, manchmal unnahbar. In Beziehungen suchst du intellektuelle Stimulation mehr als Small Talk.',
    mayaWhisper:
      'Expression und Personality arbeiten zusammen – deine Außenwirkung hat zwei Gesichter.',
    relatedTo: ['personality'],
  },
  'soul-urge': {
    detail:
      'Im Innersten treibt dich der Wunsch an, Erster zu sein – nicht aus Ego, sondern aus dem Bedürfnis nach Authentizität. Du willst nicht kopieren, du willst kreieren. In Partnerschaften brauchst du jemanden, der deine Autonomie respektiert.',
    mayaWhisper:
      'Soul Urge plus Life Path – du marschierst in eine Richtung und schaust selten zurück. Stärke oder Flucht?',
    relatedTo: ['life-path'],
  },
  'personality': {
    detail:
      'Deine Personality zeigt anderen deine fürsorgliche Seite. Menschen kommen zu dir mit ihren Problemen, weil du Stabilität ausstrahlst. Das steht im interessanten Kontrast zu deiner inneren Seite – außen Harmonie, innen Revolution.',
    mayaWhisper:
      'Personality ist dein soziales Gesicht – der Kümmerer. Aber dein Soul Urge will frei sein. Fühlst du dich zerrissen?',
    relatedTo: ['expression'],
  },
  'aspects-harmony': {
    detail:
      'Deine harmonischen Aspekte sind überdurchschnittlich. Deine Planeten arbeiten zusammen statt gegeneinander. Das gibt dir eine natürliche Leichtigkeit in vielen Lebensbereichen. Aber Vorsicht: Zu viel Harmonie kann auch Bequemlichkeit fördern.',
    mayaWhisper:
      'Harmonien sind ein Geschenk – aber Geschenke die man nicht auspackt, sind nutzlos.',
    relatedTo: ['aspects-tension'],
  },
  'aspects-tension': {
    detail:
      'Spannungsaspekte bedeuten innere Spannung die nach Ausdruck sucht, aber keinen natürlichen Ausgleich findet. Das erzeugt Antrieb – du kannst nicht stillsitzen. Die Herausforderung: Diese Energie produktiv kanalisieren.',
    mayaWhisper:
      'Quadrate ohne Oppositionen – ein Motor der ständig läuft. Kein Wunder dass du so viele Projekte jonglierst.',
    relatedTo: ['aspects-harmony'],
  },
  'angles': {
    detail:
      'Aszendent und Medium Coeli liefern die persönlichsten Datenpunkte deines Charts. Der Aszendent zeigt, wie du auf andere wirkst. Das MC zeigt deine Berufung. Beides zusammen formt das Bild, das die Welt von dir sieht.',
    mayaWhisper:
      'Dein Aszendent ist die Maske, dein MC ist die Bühne. Beides echt – nur verschiedene Facetten.',
    relatedTo: [],
  },
  'planets': {
    detail:
      'Ein vollständiges Planetenbild bedeutet eine breite Datenbasis für deine Analyse. Je mehr Himmelskörper berechnet werden, desto differenzierter wird das Gesamtbild deiner Persönlichkeit und deiner Beziehungsmuster.',
    mayaWhisper:
      'Viele Datenpunkte heißt: weniger Vermutung, mehr Erkenntnis. Dein Chart spricht laut.',
    relatedTo: [],
  },
  'fusion-high': {
    detail:
      'Numerologie und Astrologie zeigen beide starke Werte – das ist selten. Wenn beide Systeme übereinstimmen, ist die Aussagekraft besonders hoch. Du bekommst einen Synergie-Bonus, weil deine Persönlichkeit aus verschiedenen Blickwinkeln konsistent erscheint.',
    mayaWhisper:
      'Zwei Systeme, ein Ergebnis – du bist kongruent. Das ist die beste Basis für Beziehungsarbeit.',
    relatedTo: [],
  },
  'fusion-divergence': {
    detail:
      'Numerologie und Astrologie weichen stark voneinander ab. Das bedeutet nicht, dass etwas falsch ist – es zeigt Komplexität. Verschiedene Facetten deiner Persönlichkeit arbeiten in unterschiedliche Richtungen. Das macht die Interpretation spannender.',
    mayaWhisper:
      'Divergenz ist kein Fehler – es ist ein Hinweis auf verborgene Spannung. Lass uns das im Studio besprechen.',
    relatedTo: [],
  },
  'fusion-master': {
    detail:
      'Eine Master Number trifft auf harmonische Aspekte in deinem Chart. Das verstärkt dein Potenzial erheblich. Master Numbers bringen Intensität, harmonische Aspekte bringen Leichtigkeit – zusammen ergibt das fokussierte Kraft.',
    mayaWhisper:
      'Master Number plus Harmonie – du hast Werkzeuge, die andere nicht haben. Nutzt du sie?',
    relatedTo: [],
  },
};

/**
 * Map a scoring-engine claim ID (e.g. "NUM_LIFEPATH_1") to its discovery slug.
 */
export function claimIdToSlug(claimId: string): InsightSlug | null {
  if (claimId.startsWith('NUM_LIFEPATH')) return 'life-path';
  if (claimId.startsWith('NUM_EXPRESSION')) return 'expression';
  if (claimId.startsWith('NUM_SOULURGE')) return 'soul-urge';
  if (claimId.startsWith('NUM_PERSONALITY')) return 'personality';
  if (claimId.startsWith('AST_HARMONIC')) return 'aspects-harmony';
  if (claimId.startsWith('AST_HARD_ASPECTS')) return 'aspects-tension';
  if (claimId === 'AST_ANGLES_PRESENT') return 'angles';
  if (claimId === 'AST_PLANETS_FULL') return 'planets';
  if (claimId === 'FUSION_HIGH_ALIGNMENT') return 'fusion-high';
  if (claimId === 'FUSION_DIVERGENCE') return 'fusion-divergence';
  if (claimId === 'FUSION_MASTER_HARMONY') return 'fusion-master';
  return null;
}

/**
 * Get enrichment data for a claim. Returns null if no enrichment available.
 */
export function getInsightEnrichment(claimId: string): InsightEnrichment | null {
  const slug = claimIdToSlug(claimId);
  if (!slug) return null;
  return TEXTS[slug] ?? null;
}

/**
 * Resolve related slugs for a claim back to claim IDs in the current result.
 * Returns indices of related claims in the claims array.
 */
export function getRelatedIndices(
  currentClaimId: string,
  allClaimIds: string[],
): number[] {
  const enrichment = getInsightEnrichment(currentClaimId);
  if (!enrichment || enrichment.relatedTo.length === 0) return [];

  const relatedSlugs = new Set(enrichment.relatedTo);
  const indices: number[] = [];

  for (let i = 0; i < allClaimIds.length; i++) {
    const slug = claimIdToSlug(allClaimIds[i]!);
    if (slug && relatedSlugs.has(slug)) {
      indices.push(i);
    }
  }

  return indices;
}
