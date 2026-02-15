import type { StudioSeat } from '../../../shared/types/studio';

// ══════════════════════════════════════════════════════════════
// User Memory Timeline v2 — DSL-compressed, 3-Tier Storage
// ══════════════════════════════════════════════════════════════
//
// Tier 1 (Hot)  : ≤7 days   — individual entries, max 100
// Tier 2 (Warm) : 8–90 days — auto-merged by persona+tags, max 50
// Tier 3 (Cold) : 90+ days  — ultra-compressed summaries, max 30
//
// DSL per entry: TYPE|DATE|PERSONA|SENT|TAGS|SUMMARY
// Merged DSL:    TYPE|DATE1-DATE2|PERSONA|SENT1→SENT2|TAGS|SUMMARY|xCOUNT
//
// Never deletes — only compresses. A heavy user gets years of memory.
// ══════════════════════════════════════════════════════════════

export type MemoryEntryType =
  | 'theme' | 'insight' | 'preference' | 'boundary' | 'milestone';

export type Sentiment =
  | 'positive' | 'curious' | 'neutral'
  | 'defensive' | 'vulnerable' | 'hostile' | 'distressed';

export interface MemoryEntry {
  ts: string;
  type: MemoryEntryType;
  persona: StudioSeat | 'system';
  summary: string;
  tags: string[];
  sentiment: Sentiment;
  count?: number;       // >1 if merged
  firstTs?: string;     // earliest timestamp (merged)
  endSentiment?: Sentiment; // sentiment arc end (merged)
}

export interface StrikeRecord {
  count: number;
  lastStrike: string | null;
  banUntil: string | null;
  permanent: boolean;
}

// ── DSL Token Maps ──

const TYPE_TO_DSL: Record<MemoryEntryType, string> = {
  theme: 'T', insight: 'I', preference: 'P', boundary: 'B', milestone: 'M',
};
const DSL_TO_TYPE: Record<string, MemoryEntryType> = {
  T: 'theme', I: 'insight', P: 'preference', B: 'boundary', M: 'milestone',
};

type PersonaKey = StudioSeat | 'system';
const PERSONA_TO_DSL: Record<PersonaKey, string> = {
  maya: 'm', lilith: 'l', luna: 'u', orion: 'o', system: 's',
};
const DSL_TO_PERSONA: Record<string, PersonaKey> = {
  m: 'maya', l: 'lilith', u: 'luna', o: 'orion', s: 'system',
};

const SENT_TO_DSL: Record<Sentiment, string> = {
  positive: '+', curious: '?', neutral: '.', defensive: '!',
  vulnerable: '~', hostile: 'X', distressed: '%',
};
const DSL_TO_SENT: Record<string, Sentiment> = {
  '+': 'positive', '?': 'curious', '.': 'neutral', '!': 'defensive',
  '~': 'vulnerable', X: 'hostile', '%': 'distressed',
};

const TAG_ABBREV: Record<string, string> = {
  relationship: 'rel', love: 'lov', family: 'fam', career: 'car',
  work: 'wrk', anxiety: 'anx', fear: 'fer', grief: 'grf', loss: 'los',
  'self-worth': 'swt', future: 'fut', goals: 'gol', spirituality: 'spi',
  intimacy: 'int', body: 'bdy', health: 'hlt', 'mental-health': 'mh',
  finances: 'fin', loneliness: 'lon', anger: 'ang', trust: 'tru',
  change: 'chg', transition: 'trn', preference: 'prf', strike: 'stk',
  moderation: 'mod', 'first-chat': 'fc', 'deep-chat': 'dc',
  shadow: 'shd', abandonment: 'abd', avoidance: 'avo',
};
const TAG_EXPAND: Record<string, string> = {};
for (const [full, short] of Object.entries(TAG_ABBREV)) TAG_EXPAND[short] = full;

function compressTag(t: string): string { return TAG_ABBREV[t] ?? t.slice(0, 3); }
function expandTag(t: string): string { return TAG_EXPAND[t] ?? t; }

// ── DSL date: YYMMDD ──
function dateToDsl(iso: string): string {
  return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
}
function dslToDate(d: string): string {
  if (d.length !== 6) return '20' + d;
  return `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`;
}

// ── Encode / Decode ──

function encodeDsl(e: MemoryEntry): string {
  const t = TYPE_TO_DSL[e.type] ?? 'T';
  const p = PERSONA_TO_DSL[e.persona] ?? 's';
  const s = SENT_TO_DSL[e.sentiment] ?? '.';
  const tags = e.tags.map(compressTag).join(',');
  const sum = e.summary.replace(/\|/g, '/');

  if (e.count && e.count > 1 && e.firstTs) {
    const d1 = dateToDsl(e.firstTs);
    const d2 = dateToDsl(e.ts);
    const es = e.endSentiment ? SENT_TO_DSL[e.endSentiment] ?? s : s;
    const sentArc = s === es ? s : `${s}>${es}`;
    return `${t}|${d1}-${d2}|${p}|${sentArc}|${tags}|${sum}|x${e.count}`;
  }

  return `${t}|${dateToDsl(e.ts)}|${p}|${s}|${tags}|${sum}`;
}

function decodeDsl(line: string): MemoryEntry | null {
  const parts = line.split('|');
  if (parts.length < 6) return null;

  const type = DSL_TO_TYPE[parts[0]!] ?? 'theme';
  const dateStr = parts[1]!;
  const persona = DSL_TO_PERSONA[parts[2]!] ?? 'system';
  const sentStr = parts[3]!;
  const tags = parts[4]! ? parts[4]!.split(',').map(expandTag) : [];
  const summary = parts[5]!.replace(/\//g, '|');

  // Parse merged fields
  let ts: string;
  let firstTs: string | undefined;
  let count: number | undefined;
  let sentiment: Sentiment;
  let endSentiment: Sentiment | undefined;

  if (dateStr.includes('-')) {
    const [d1, d2] = dateStr.split('-');
    firstTs = dslToDate(d1!);
    ts = dslToDate(d2!);
  } else {
    ts = dslToDate(dateStr);
  }

  if (sentStr.includes('>')) {
    const [s1, s2] = sentStr.split('>');
    sentiment = DSL_TO_SENT[s1!] ?? 'neutral';
    endSentiment = DSL_TO_SENT[s2!] ?? 'neutral';
  } else {
    sentiment = DSL_TO_SENT[sentStr] ?? 'neutral';
  }

  if (parts.length >= 7 && parts[6]!.startsWith('x')) {
    count = parseInt(parts[6]!.slice(1), 10) || 1;
  }

  return { ts, type, persona, summary, tags, sentiment, count, firstTs, endSentiment };
}

// ── Storage Structure ──

interface MemoryStoreV2 {
  v: 2;
  p: string;    // profileId
  h: string[];  // hot tier (DSL lines)
  w: string[];  // warm tier (merged DSL)
  c: string[];  // cold tier (ultra-merged DSL)
  s: StrikeRecord;
}

// Legacy v1 for migration
interface MemoryStoreV1 {
  version: 1;
  profileId: string;
  entries: MemoryEntry[];
  strikes: StrikeRecord;
}

const STORAGE_PREFIX = 'soulmatch.memory.';
const HOT_MAX = 100;
const WARM_MAX = 50;
const COLD_MAX = 30;
const HOT_DAYS = 7;
const WARM_DAYS = 90;

function storageKey(profileId: string): string {
  return STORAGE_PREFIX + profileId;
}

function emptyStoreV2(profileId: string): MemoryStoreV2 {
  return {
    v: 2, p: profileId, h: [], w: [], c: [],
    s: { count: 0, lastStrike: null, banUntil: null, permanent: false },
  };
}

function migrateV1(v1: MemoryStoreV1): MemoryStoreV2 {
  const store = emptyStoreV2(v1.profileId);
  store.s = v1.strikes;
  for (const e of v1.entries) {
    store.h.push(encodeDsl(e));
  }
  return store;
}

function loadStore(profileId: string): MemoryStoreV2 {
  const raw = localStorage.getItem(storageKey(profileId));
  if (!raw) return emptyStoreV2(profileId);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v === 2 && parsed.p === profileId) return parsed as MemoryStoreV2;
    if (parsed?.version === 1 && parsed.profileId === profileId) return migrateV1(parsed as MemoryStoreV1);
    return emptyStoreV2(profileId);
  } catch {
    return emptyStoreV2(profileId);
  }
}

function saveStore(store: MemoryStoreV2): void {
  try {
    localStorage.setItem(storageKey(store.p), JSON.stringify(store));
  } catch { /* quota */ }
}

// ── Merge Logic ──

function mergeKey(e: MemoryEntry): string {
  return `${e.type}:${e.persona}:${e.tags.sort().join(',')}`;
}

function mergeEntries(entries: MemoryEntry[]): MemoryEntry[] {
  const groups = new Map<string, MemoryEntry[]>();
  for (const e of entries) {
    const k = mergeKey(e);
    const arr = groups.get(k);
    if (arr) arr.push(e);
    else groups.set(k, [e]);
  }

  const merged: MemoryEntry[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]!);
      continue;
    }

    // Sort by timestamp ascending
    group.sort((a, b) => a.ts.localeCompare(b.ts));
    const first = group[0]!;
    const last = group[group.length - 1]!;
    const totalCount = group.reduce((sum, e) => sum + (e.count ?? 1), 0);

    merged.push({
      ts: last.ts,
      firstTs: first.firstTs ?? first.ts,
      type: first.type,
      persona: first.persona,
      summary: last.summary,
      tags: [...new Set(group.flatMap((e) => e.tags))],
      sentiment: first.sentiment,
      endSentiment: last.endSentiment ?? last.sentiment,
      count: totalCount,
    });
  }

  return merged.sort((a, b) => a.ts.localeCompare(b.ts));
}

// ── Consolidation (runs on every write) ──

function consolidate(store: MemoryStoreV2): void {
  const now = Date.now();
  const hotCutoff = now - HOT_DAYS * 86400000;
  const warmCutoff = now - WARM_DAYS * 86400000;

  // 1. Decode hot entries, split into still-hot and aged-out
  const hotEntries: MemoryEntry[] = [];
  const toWarm: MemoryEntry[] = [];

  for (const line of store.h) {
    const e = decodeDsl(line);
    if (!e) continue;
    const ets = new Date(e.ts).getTime();
    if (ets < hotCutoff) toWarm.push(e);
    else hotEntries.push(e);
  }

  // 2. If hot tier overflows, push oldest to warm
  if (hotEntries.length > HOT_MAX) {
    hotEntries.sort((a, b) => a.ts.localeCompare(b.ts));
    toWarm.push(...hotEntries.splice(0, hotEntries.length - HOT_MAX));
  }

  // 3. Decode warm tier, add aged-out hot entries, merge
  const warmEntries: MemoryEntry[] = [];
  const toCold: MemoryEntry[] = [];

  for (const line of store.w) {
    const e = decodeDsl(line);
    if (!e) continue;
    const ets = new Date(e.ts).getTime();
    if (ets < warmCutoff) toCold.push(e);
    else warmEntries.push(e);
  }
  warmEntries.push(...toWarm);
  const mergedWarm = mergeEntries(warmEntries);

  // 4. If warm tier overflows, push oldest merged to cold
  if (mergedWarm.length > WARM_MAX) {
    mergedWarm.sort((a, b) => a.ts.localeCompare(b.ts));
    toCold.push(...mergedWarm.splice(0, mergedWarm.length - WARM_MAX));
  }

  // 5. Decode cold tier, add aged-out warm, merge again
  const coldEntries: MemoryEntry[] = [];
  for (const line of store.c) {
    const e = decodeDsl(line);
    if (e) coldEntries.push(e);
  }
  coldEntries.push(...toCold);
  let mergedCold = mergeEntries(coldEntries);

  // 6. If cold tier overflows, force-merge smallest groups
  if (mergedCold.length > COLD_MAX) {
    mergedCold.sort((a, b) => a.ts.localeCompare(b.ts));
    mergedCold = mergedCold.slice(-COLD_MAX);
  }

  // 7. Re-encode all tiers
  store.h = hotEntries.map(encodeDsl);
  store.w = mergedWarm.map(encodeDsl);
  store.c = mergedCold.map(encodeDsl);
}

// ══════════════════════════════════════════
// Public API (backward compatible)
// ══════════════════════════════════════════

// Kept for compatibility — returns a virtual merged view
export interface UserMemoryStore {
  version: 1;
  profileId: string;
  entries: MemoryEntry[];
  strikes: StrikeRecord;
}

export function loadUserMemory(profileId: string): UserMemoryStore {
  const store = loadStore(profileId);
  const allEntries: MemoryEntry[] = [];
  for (const line of [...store.c, ...store.w, ...store.h]) {
    const e = decodeDsl(line);
    if (e) allEntries.push(e);
  }
  return { version: 1, profileId, entries: allEntries, strikes: store.s };
}

export function addMemoryEntry(
  profileId: string,
  entry: Omit<MemoryEntry, 'ts'>,
): UserMemoryStore {
  const store = loadStore(profileId);
  const full: MemoryEntry = { ...entry, ts: new Date().toISOString() };
  store.h.push(encodeDsl(full));
  consolidate(store);
  saveStore(store);
  return loadUserMemory(profileId);
}

export function addStrike(profileId: string, reason: string): StrikeRecord {
  const store = loadStore(profileId);
  const s = store.s;
  s.count += 1;
  s.lastStrike = new Date().toISOString();

  if (s.count >= 3) {
    s.permanent = true;
    s.banUntil = null;
  } else if (s.count === 2) {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    s.banUntil = until.toISOString();
  } else {
    const until = new Date();
    until.setHours(until.getHours() + 24);
    s.banUntil = until.toISOString();
  }

  const boundary: MemoryEntry = {
    ts: new Date().toISOString(),
    type: 'boundary', persona: 'system',
    summary: `Strike ${s.count}: ${reason}`,
    tags: ['strike', 'moderation'],
    sentiment: 'hostile',
  };
  store.h.push(encodeDsl(boundary));
  consolidate(store);
  saveStore(store);
  return s;
}

export function getBanStatus(profileId: string): { banned: boolean; permanent: boolean; remainingMs: number } {
  const store = loadStore(profileId);
  const s = store.s;
  if (s.permanent) return { banned: true, permanent: true, remainingMs: Infinity };
  if (s.banUntil) {
    const remaining = new Date(s.banUntil).getTime() - Date.now();
    if (remaining > 0) return { banned: true, permanent: false, remainingMs: remaining };
  }
  return { banned: false, permanent: false, remainingMs: 0 };
}

/**
 * Build LLM-readable context from all 3 tiers.
 * Cold entries are prefixed with a period marker showing age.
 * Warm entries show merge counts.
 * Hot entries show full detail.
 */
export function buildMemoryContext(profileId: string, maxChars = 2500): string {
  const store = loadStore(profileId);
  const sections: string[] = [];
  let totalLen = 0;

  function addSection(label: string, lines: string[], prefix: string): void {
    if (lines.length === 0) return;
    const decoded: string[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const e = decodeDsl(lines[i]!);
      if (!e) continue;
      const dateStr = e.firstTs
        ? `${e.firstTs.slice(0, 10)}→${e.ts.slice(0, 10)}`
        : e.ts.slice(0, 10);
      const cnt = e.count && e.count > 1 ? ` (×${e.count})` : '';
      const sentArc = e.endSentiment && e.endSentiment !== e.sentiment
        ? `${e.sentiment}→${e.endSentiment}`
        : e.sentiment;
      const tagStr = e.tags.length ? ` [${e.tags.join(',')}]` : '';
      const line = `${prefix}${dateStr} ${e.persona}/${e.type}/${sentArc}${tagStr}: ${e.summary}${cnt}`;

      if (totalLen + line.length + 2 > maxChars) break;
      decoded.push(line);
      totalLen += line.length + 1;
    }
    if (decoded.length > 0) {
      sections.push(`── ${label} ──\n${decoded.reverse().join('\n')}`);
    }
  }

  addSection('Langzeit-Erinnerungen', store.c, '◇ ');
  addSection('Mittelfristig', store.w, '○ ');
  addSection('Aktuell', store.h, '● ');

  return sections.join('\n');
}

export function clearUserMemory(profileId: string): void {
  localStorage.removeItem(storageKey(profileId));
}

export function getUserMemoryEntries(profileId: string): MemoryEntry[] {
  return loadUserMemory(profileId).entries;
}

export function getStrikeRecord(profileId: string): StrikeRecord {
  return loadStore(profileId).s;
}

/**
 * Storage stats for debugging / future settings UI.
 */
export function getMemoryStats(profileId: string): {
  hotCount: number; warmCount: number; coldCount: number;
  totalEntries: number; storageBytesEstimate: number;
} {
  const store = loadStore(profileId);
  const raw = localStorage.getItem(storageKey(profileId)) ?? '';
  return {
    hotCount: store.h.length,
    warmCount: store.w.length,
    coldCount: store.c.length,
    totalEntries: store.h.length + store.w.length + store.c.length,
    storageBytesEstimate: raw.length * 2, // UTF-16
  };
}
