import type { StudioSeat } from '../../../shared/types/studio';

// ── User Memory Timeline ──
// Stores compressed insights, themes, and boundary events per user.
// Format optimised for LLM context injection (compact JSON lines).
// localStorage, max MAX_ENTRIES entries (FIFO), keyed by profileId.

export type MemoryEntryType =
  | 'theme'       // topic discussed
  | 'insight'     // psychological / personality insight
  | 'preference'  // user preference or value
  | 'boundary'    // moderation event (warning, strike, ban)
  | 'milestone';  // notable moment (first chat, breakthrough, etc.)

export type Sentiment =
  | 'positive' | 'curious' | 'neutral'
  | 'defensive' | 'vulnerable' | 'hostile' | 'distressed';

export interface MemoryEntry {
  ts: string;              // ISO timestamp
  type: MemoryEntryType;
  persona: StudioSeat | 'system';
  summary: string;         // 1-2 sentence compressed insight
  tags: string[];          // keyword tags for retrieval
  sentiment: Sentiment;
}

export interface StrikeRecord {
  count: number;           // total strikes
  lastStrike: string | null; // ISO timestamp of most recent strike
  banUntil: string | null;   // ISO timestamp, null if not banned
  permanent: boolean;
}

export interface UserMemoryStore {
  version: 1;
  profileId: string;
  entries: MemoryEntry[];
  strikes: StrikeRecord;
}

const STORAGE_PREFIX = 'soulmatch.memory.';
const MAX_ENTRIES = 50;

// ── Helpers ──

function storageKey(profileId: string): string {
  return STORAGE_PREFIX + profileId;
}

function emptyStore(profileId: string): UserMemoryStore {
  return {
    version: 1,
    profileId,
    entries: [],
    strikes: { count: 0, lastStrike: null, banUntil: null, permanent: false },
  };
}

// ── Public API ──

export function loadUserMemory(profileId: string): UserMemoryStore {
  const raw = localStorage.getItem(storageKey(profileId));
  if (!raw) return emptyStore(profileId);
  try {
    const parsed = JSON.parse(raw) as UserMemoryStore;
    if (parsed?.version !== 1 || parsed.profileId !== profileId) return emptyStore(profileId);
    return parsed;
  } catch {
    return emptyStore(profileId);
  }
}

function save(store: UserMemoryStore): void {
  try {
    localStorage.setItem(storageKey(store.profileId), JSON.stringify(store));
  } catch { /* quota */ }
}

export function addMemoryEntry(
  profileId: string,
  entry: Omit<MemoryEntry, 'ts'>,
): UserMemoryStore {
  const store = loadUserMemory(profileId);
  store.entries.push({ ...entry, ts: new Date().toISOString() });
  // FIFO cap
  if (store.entries.length > MAX_ENTRIES) {
    store.entries = store.entries.slice(-MAX_ENTRIES);
  }
  save(store);
  return store;
}

export function addStrike(profileId: string, reason: string): StrikeRecord {
  const store = loadUserMemory(profileId);
  const s = store.strikes;
  s.count += 1;
  s.lastStrike = new Date().toISOString();

  if (s.count >= 3) {
    s.permanent = true;
    s.banUntil = null; // permanent overrides timed ban
  } else if (s.count === 2) {
    // 1 week ban
    const until = new Date();
    until.setDate(until.getDate() + 7);
    s.banUntil = until.toISOString();
  } else {
    // 24h ban
    const until = new Date();
    until.setHours(until.getHours() + 24);
    s.banUntil = until.toISOString();
  }

  // Also log as boundary entry
  store.entries.push({
    ts: new Date().toISOString(),
    type: 'boundary',
    persona: 'system',
    summary: `Strike ${s.count}: ${reason}`,
    tags: ['strike', 'moderation'],
    sentiment: 'hostile',
  });
  if (store.entries.length > MAX_ENTRIES) {
    store.entries = store.entries.slice(-MAX_ENTRIES);
  }

  save(store);
  return s;
}

export function getBanStatus(profileId: string): { banned: boolean; permanent: boolean; remainingMs: number } {
  const store = loadUserMemory(profileId);
  const s = store.strikes;

  if (s.permanent) {
    return { banned: true, permanent: true, remainingMs: Infinity };
  }
  if (s.banUntil) {
    const remaining = new Date(s.banUntil).getTime() - Date.now();
    if (remaining > 0) {
      return { banned: true, permanent: false, remainingMs: remaining };
    }
  }
  return { banned: false, permanent: false, remainingMs: 0 };
}

/**
 * Build a compact context string from the memory timeline for LLM injection.
 * Format: one line per entry, newest last.
 * Caps at ~2000 chars to stay within token budget.
 */
export function buildMemoryContext(profileId: string, maxChars = 2000): string {
  const store = loadUserMemory(profileId);
  if (store.entries.length === 0) return '';

  const lines: string[] = [];
  let totalLen = 0;

  // Iterate newest-first, but we'll reverse at the end for chronological order
  for (let i = store.entries.length - 1; i >= 0; i--) {
    const e = store.entries[i]!;
    const date = e.ts.slice(0, 10); // YYYY-MM-DD
    const line = `[${date}|${e.type}|${e.persona}|${e.sentiment}] ${e.summary}${e.tags.length ? ' #' + e.tags.join(' #') : ''}`;

    if (totalLen + line.length + 1 > maxChars) break;
    lines.push(line);
    totalLen += line.length + 1;
  }

  return lines.reverse().join('\n');
}

export function clearUserMemory(profileId: string): void {
  localStorage.removeItem(storageKey(profileId));
}

export function getUserMemoryEntries(profileId: string): MemoryEntry[] {
  return loadUserMemory(profileId).entries;
}

export function getStrikeRecord(profileId: string): StrikeRecord {
  return loadUserMemory(profileId).strikes;
}
